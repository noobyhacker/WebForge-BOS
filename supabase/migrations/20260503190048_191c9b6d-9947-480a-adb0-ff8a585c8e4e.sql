-- Map legacy entity_type/entity_id to typed FKs on insert so cascade_fill can do the rest
CREATE OR REPLACE FUNCTION public.activities_legacy_entity_map()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
    IF NEW.entity_type IN ('client','lead') AND NEW.lead_id IS NULL THEN
      NEW.lead_id := NEW.entity_id;
    ELSIF NEW.entity_type = 'contact' AND NEW.contact_id IS NULL THEN
      NEW.contact_id := NEW.entity_id;
    ELSIF NEW.entity_type = 'account' AND NEW.account_id IS NULL THEN
      NEW.account_id := NEW.entity_id;
    ELSIF NEW.entity_type = 'deal' AND NEW.deal_id IS NULL THEN
      NEW.deal_id := NEW.entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activities_legacy_entity_map ON public.activities;
CREATE TRIGGER trg_activities_legacy_entity_map
  BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_legacy_entity_map();

-- Make sure legacy mapping runs before cascade fill
ALTER TABLE public.activities DISABLE TRIGGER trg_activities_cascade_fill;
ALTER TABLE public.activities ENABLE TRIGGER trg_activities_cascade_fill;