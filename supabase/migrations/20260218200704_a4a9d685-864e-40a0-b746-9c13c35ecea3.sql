
-- ============================================================
-- PHASE 1: Stability & Scale — Job Queue, Domain Events,
--          System Health, Feature Flags, AI Suggestions,
--          Soft Delete columns
-- ============================================================

-- 1. Job Queue
CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  priority int NOT NULL DEFAULT 0,
  locked_by text,
  locked_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_job_queue_poll ON public.job_queue (status, priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_job_queue_type_status ON public.job_queue (job_type, status);

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role only

-- 2. Domain Events (immutable, append-only)
CREATE TABLE IF NOT EXISTS public.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  actor_id uuid,
  actor_type text NOT NULL DEFAULT 'user',
  payload jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_entity ON public.domain_events (entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON public.domain_events (event_type, created_at);

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domain_events_select_admin"
  ON public.domain_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. System Health Logs
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  metrics jsonb DEFAULT '{}'::jsonb,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_type ON public.system_health_logs (event_type, created_at);

ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_health_logs_select_admin"
  ON public.system_health_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Feature Flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT false,
  scope text NOT NULL DEFAULT 'global',
  scope_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_all"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "feature_flags_insert_admin"
  ON public.feature_flags FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "feature_flags_update_admin"
  ON public.feature_flags FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "feature_flags_delete_admin"
  ON public.feature_flags FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. AI Suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  suggestion_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_entity ON public.ai_suggestions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON public.ai_suggestions (status);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_suggestions_select_approved"
  ON public.ai_suggestions FOR SELECT
  USING (is_approved(auth.uid()));

CREATE POLICY "ai_suggestions_update_approved"
  ON public.ai_suggestions FOR UPDATE
  USING (is_approved(auth.uid()))
  WITH CHECK (is_approved(auth.uid()));

-- 6. Soft Delete columns on applicable tables
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Partial indexes for active-only queries
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_active ON public.contacts (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_active ON public.accounts (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_active ON public.deals (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_active ON public.quotes (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_active ON public.invoices (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON public.automation_rules (id) WHERE deleted_at IS NULL;
