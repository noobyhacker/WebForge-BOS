
-- 1. Soft delete columns on follow_up_sequences
ALTER TABLE public.follow_up_sequences ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.follow_up_sequences ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;

-- 2. Soft delete columns on pipeline_stages
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;

-- 3. Add delay_minutes to follow_up_sequence_steps
ALTER TABLE public.follow_up_sequence_steps ADD COLUMN IF NOT EXISTS delay_minutes integer NOT NULL DEFAULT 1440;
-- Migrate existing delay_days values
UPDATE public.follow_up_sequence_steps SET delay_minutes = delay_days * 1440 WHERE delay_minutes = 1440 AND delay_days != 1;

-- 4. Add metadata to domain_events if missing
ALTER TABLE public.domain_events ADD COLUMN IF NOT EXISTS metadata jsonb NULL DEFAULT '{}'::jsonb;

-- 5. Create follow_up_sequence_enrollments
CREATE TABLE IF NOT EXISTS public.follow_up_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.follow_up_sequences(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_step_index integer NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  last_step_executed_at timestamptz NULL,
  enrolled_by uuid NULL
);

ALTER TABLE public.follow_up_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_select_policy" ON public.follow_up_sequence_enrollments
  FOR SELECT USING (is_approved(auth.uid()));

CREATE POLICY "enrollments_insert_policy" ON public.follow_up_sequence_enrollments
  FOR INSERT WITH CHECK (is_approved(auth.uid()));

CREATE POLICY "enrollments_update_policy" ON public.follow_up_sequence_enrollments
  FOR UPDATE USING (is_approved(auth.uid()));

-- 6. Create sla_configs
CREATE TABLE IF NOT EXISTS public.sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT 'lead',
  metric text NOT NULL DEFAULT 'first_response',
  threshold_minutes integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_configs_select_policy" ON public.sla_configs
  FOR SELECT USING (is_approved(auth.uid()));

CREATE POLICY "sla_configs_insert_policy" ON public.sla_configs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sla_configs_update_policy" ON public.sla_configs
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sla_configs_delete_policy" ON public.sla_configs
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default SLA config
INSERT INTO public.sla_configs (entity_type, metric, threshold_minutes)
VALUES ('lead', 'first_response', 30)
ON CONFLICT DO NOTHING;

-- 7. Create sla_breaches
CREATE TABLE IF NOT EXISTS public.sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_config_id uuid NOT NULL REFERENCES public.sla_configs(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  breached_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  threshold_minutes integer NOT NULL,
  actual_minutes numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_breaches_select_admin" ON public.sla_breaches
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR owner_id = auth.uid());

CREATE POLICY "sla_breaches_insert_policy" ON public.sla_breaches
  FOR INSERT WITH CHECK (is_approved(auth.uid()));

CREATE POLICY "sla_breaches_update_policy" ON public.sla_breaches
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR owner_id = auth.uid());

-- 8. Performance indexes
CREATE INDEX IF NOT EXISTS idx_deals_stage_deleted ON public.deals(stage, deleted_at);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clients_status_deleted ON public.clients(status, deleted_at, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON public.invoices(status, due_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.follow_up_sequence_enrollments(status, last_step_executed_at);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_entity ON public.sla_breaches(entity_type, entity_id, resolved_at);
