-- =========================================================
-- PHASE 1: STRUCTURAL COLUMNS (idempotent)
-- =========================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS account_id uuid,
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid,
  ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qualification_status text DEFAULT 'unqualified',
  ADD COLUMN IF NOT EXISTS next_action_type text,
  ADD COLUMN IF NOT EXISTS next_action_date timestamptz;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lead_id uuid;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS account_id uuid,
  ADD COLUMN IF NOT EXISTS contact_id uuid,
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS deal_id uuid;

-- =========================================================
-- PHASE 2: BACKFILL (all rows, including soft-deleted)
-- =========================================================

DO $backfill$
DECLARE
  r record;
  v_account_id uuid;
  v_contact_id uuid;
  v_lead_id uuid;
  v_default_owner uuid;
BEGIN
  SELECT id INTO v_default_owner FROM public.profiles ORDER BY created_at LIMIT 1;

  -- 2a. Contacts missing account
  FOR r IN SELECT id, owner_id, first_name, last_name, email FROM public.contacts WHERE account_id IS NULL LOOP
    INSERT INTO public.accounts (name, owner_id)
    VALUES (
      'Auto: ' || COALESCE(NULLIF(TRIM(COALESCE(r.first_name,'') || ' ' || COALESCE(r.last_name,'')), ''), r.email, 'Unnamed Contact'),
      COALESCE(r.owner_id, v_default_owner)
    )
    RETURNING id INTO v_account_id;
    UPDATE public.contacts SET account_id = v_account_id WHERE id = r.id;
  END LOOP;

  -- 2b. Leads missing account
  FOR r IN SELECT id, user_id, name, company, email, phone FROM public.clients WHERE account_id IS NULL LOOP
    INSERT INTO public.accounts (name, owner_id)
    VALUES (
      'Auto: ' || COALESCE(NULLIF(TRIM(COALESCE(r.company, r.name)), ''), r.email, 'Unnamed Lead'),
      COALESCE(r.user_id, v_default_owner)
    )
    RETURNING id INTO v_account_id;
    UPDATE public.clients SET account_id = v_account_id WHERE id = r.id;
  END LOOP;

  -- 2c. Leads missing primary_contact
  FOR r IN SELECT id, user_id, account_id, name, email, phone FROM public.clients WHERE primary_contact_id IS NULL LOOP
    INSERT INTO public.contacts (first_name, last_name, email, phone, account_id, owner_id)
    VALUES (
      COALESCE(NULLIF(split_part(COALESCE(r.name,'Unnamed'), ' ', 1),''), 'Unnamed'),
      COALESCE(NULLIF(substring(COALESCE(r.name,'') FROM position(' ' IN COALESCE(r.name,'')) + 1), ''), ''),
      r.email,
      r.phone,
      r.account_id,
      COALESCE(r.user_id, v_default_owner)
    )
    RETURNING id INTO v_contact_id;
    UPDATE public.clients SET primary_contact_id = v_contact_id WHERE id = r.id;
  END LOOP;

  -- 2d. Deals: backfill account_id from contact
  UPDATE public.deals d SET account_id = c.account_id
  FROM public.contacts c WHERE d.account_id IS NULL AND d.contact_id = c.id;

  -- 2e. Deals still missing account
  FOR r IN SELECT id, owner_id, name FROM public.deals WHERE account_id IS NULL LOOP
    INSERT INTO public.accounts (name, owner_id)
    VALUES ('Auto: Deal — ' || COALESCE(r.name, 'Unnamed'), COALESCE(r.owner_id, v_default_owner))
    RETURNING id INTO v_account_id;
    UPDATE public.deals SET account_id = v_account_id WHERE id = r.id;
  END LOOP;

  -- 2f. Deals missing lead → create placeholder Lead
  FOR r IN SELECT id, owner_id, account_id, name, contact_id FROM public.deals WHERE lead_id IS NULL LOOP
    v_contact_id := r.contact_id;
    IF v_contact_id IS NULL THEN
      SELECT id INTO v_contact_id FROM public.contacts WHERE account_id = r.account_id ORDER BY created_at LIMIT 1;
    END IF;
    IF v_contact_id IS NULL THEN
      INSERT INTO public.contacts (first_name, last_name, account_id, owner_id)
      VALUES ('Auto', 'Contact', r.account_id, COALESCE(r.owner_id, v_default_owner))
      RETURNING id INTO v_contact_id;
    END IF;

    INSERT INTO public.clients (name, user_id, account_id, primary_contact_id, status)
    VALUES ('Auto Lead: ' || COALESCE(r.name, 'Unnamed'), COALESCE(r.owner_id, v_default_owner),
            r.account_id, v_contact_id, 'lead')
    RETURNING id INTO v_lead_id;
    UPDATE public.deals SET lead_id = v_lead_id WHERE id = r.id;
  END LOOP;

  -- 2g. Activities: migrate polymorphic refs
  UPDATE public.activities a
  SET lead_id = c.id, account_id = COALESCE(a.account_id, c.account_id), contact_id = COALESCE(a.contact_id, c.primary_contact_id)
  FROM public.clients c WHERE a.lead_id IS NULL AND a.entity_type = 'client' AND a.entity_id = c.id;

  UPDATE public.activities a
  SET contact_id = ct.id, account_id = COALESCE(a.account_id, ct.account_id)
  FROM public.contacts ct WHERE a.contact_id IS NULL AND a.entity_type = 'contact' AND a.entity_id = ct.id;

  UPDATE public.activities a
  SET account_id = ac.id FROM public.accounts ac
  WHERE a.account_id IS NULL AND a.entity_type = 'account' AND a.entity_id = ac.id;

  UPDATE public.activities a
  SET deal_id = d.id, account_id = COALESCE(a.account_id, d.account_id), lead_id = COALESCE(a.lead_id, d.lead_id)
  FROM public.deals d WHERE a.deal_id IS NULL AND a.entity_type = 'deal' AND a.entity_id = d.id;

  -- 2h. Activities still without account → catch-all
  FOR r IN SELECT id, owner_id FROM public.activities WHERE account_id IS NULL LOOP
    INSERT INTO public.accounts (name, owner_id)
    VALUES ('Auto: Orphan Activity', COALESCE(r.owner_id, v_default_owner))
    RETURNING id INTO v_account_id;
    UPDATE public.activities SET account_id = v_account_id WHERE id = r.id;
  END LOOP;
END
$backfill$;

-- =========================================================
-- PHASE 3: NOT NULL + INDEXES
-- =========================================================

ALTER TABLE public.contacts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.clients  ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.clients  ALTER COLUMN primary_contact_id SET NOT NULL;
ALTER TABLE public.deals    ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.deals    ALTER COLUMN lead_id SET NOT NULL;
ALTER TABLE public.activities ALTER COLUMN account_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_clients_account_id ON public.clients(account_id);
CREATE INDEX IF NOT EXISTS idx_clients_primary_contact_id ON public.clients(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_account_id ON public.deals(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON public.deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON public.activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON public.activities(deal_id);

-- =========================================================
-- PHASE 4: CASCADE-DERIVE TRIGGERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.activities_cascade_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead record; v_deal record; v_contact record;
BEGIN
  IF NEW.deal_id IS NOT NULL THEN
    SELECT account_id, lead_id INTO v_deal FROM public.deals WHERE id = NEW.deal_id;
    IF NEW.account_id IS NULL THEN NEW.account_id := v_deal.account_id; END IF;
    IF NEW.lead_id IS NULL THEN NEW.lead_id := v_deal.lead_id; END IF;
  END IF;
  IF NEW.lead_id IS NOT NULL THEN
    SELECT account_id, primary_contact_id INTO v_lead FROM public.clients WHERE id = NEW.lead_id;
    IF NEW.account_id IS NULL THEN NEW.account_id := v_lead.account_id; END IF;
    IF NEW.contact_id IS NULL THEN NEW.contact_id := v_lead.primary_contact_id; END IF;
  END IF;
  IF NEW.contact_id IS NOT NULL AND NEW.account_id IS NULL THEN
    SELECT account_id INTO v_contact FROM public.contacts WHERE id = NEW.contact_id;
    NEW.account_id := v_contact.account_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activities_cascade_fill ON public.activities;
CREATE TRIGGER trg_activities_cascade_fill
  BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_cascade_fill();

CREATE OR REPLACE FUNCTION public.deals_cascade_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead record;
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    SELECT account_id INTO v_lead FROM public.clients WHERE id = NEW.lead_id;
    IF NEW.account_id IS NULL THEN
      NEW.account_id := v_lead.account_id;
    ELSIF v_lead.account_id IS NOT NULL AND v_lead.account_id <> NEW.account_id THEN
      RAISE EXCEPTION 'Deal account_id (%) does not match its lead account_id (%)', NEW.account_id, v_lead.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_cascade_fill ON public.deals;
CREATE TRIGGER trg_deals_cascade_fill
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_cascade_fill();

CREATE OR REPLACE FUNCTION public.leads_cascade_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_contact record;
BEGIN
  IF NEW.primary_contact_id IS NOT NULL THEN
    SELECT account_id INTO v_contact FROM public.contacts WHERE id = NEW.primary_contact_id;
    IF NEW.account_id IS NULL THEN
      NEW.account_id := v_contact.account_id;
    ELSIF v_contact.account_id IS NOT NULL AND v_contact.account_id <> NEW.account_id THEN
      RAISE EXCEPTION 'Lead account_id (%) does not match primary_contact account_id (%)', NEW.account_id, v_contact.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_cascade_fill ON public.clients;
CREATE TRIGGER trg_leads_cascade_fill
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.leads_cascade_fill();

-- =========================================================
-- PHASE 5: LEAD → DEAL CONVERSION
-- =========================================================

CREATE OR REPLACE FUNCTION public.convert_lead_to_deal(
  _lead_id uuid, _name text, _value numeric DEFAULT 0, _stage text DEFAULT 'prospecting'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead record; v_deal_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_lead FROM public.clients WHERE id = _lead_id AND deleted_at IS NULL;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;

  INSERT INTO public.deals (name, account_id, lead_id, contact_id, owner_id, value, stage)
  VALUES (_name, v_lead.account_id, v_lead.id, v_lead.primary_contact_id, auth.uid(), _value, _stage::deal_stage)
  RETURNING id INTO v_deal_id;
  RETURN v_deal_id;
END;
$$;

-- =========================================================
-- PHASE 6: UNIFIED TIMELINE VIEW
-- =========================================================

DROP VIEW IF EXISTS public.entity_timeline;
CREATE VIEW public.entity_timeline
WITH (security_invoker = true)
AS
SELECT 'activity'::text AS kind, a.id, a.account_id, a.contact_id, a.lead_id, a.deal_id,
       a.owner_id AS actor_id, COALESCE(a.subject, a.type::text) AS title,
       a.description AS body, a.type::text AS subtype, a.created_at
FROM public.activities a
UNION ALL
SELECT 'comment', ec.id,
       CASE WHEN ec.entity_type = 'account' THEN ec.entity_id END,
       CASE WHEN ec.entity_type = 'contact' THEN ec.entity_id END,
       CASE WHEN ec.entity_type IN ('client','lead') THEN ec.entity_id END,
       CASE WHEN ec.entity_type = 'deal' THEN ec.entity_id END,
       ec.user_id, 'Comment', ec.content, ec.entity_type, ec.created_at
FROM public.entity_comments ec
UNION ALL
SELECT 'follow_up', f.id, c.account_id, c.primary_contact_id, f.client_id, NULL::uuid,
       f.user_id, COALESCE(f.type, 'Follow-up'), f.notes, f.status, f.created_at
FROM public.follow_ups f LEFT JOIN public.clients c ON c.id = f.client_id
UNION ALL
SELECT 'stage_change', h.id, d.account_id, d.contact_id, d.lead_id, h.deal_id,
       h.changed_by, 'Stage: ' || h.from_stage || ' → ' || h.to_stage,
       h.note, 'stage_change', h.created_at
FROM public.deal_stage_history h LEFT JOIN public.deals d ON d.id = h.deal_id;