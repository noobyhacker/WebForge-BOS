
-- PHASE 2 (retry): Drop existing policies if any, then create remaining tables

-- Fix notifications policies (table already exists)
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- Pipeline stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#3b82f6',
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pipeline_stages_select_all" ON public.pipeline_stages;
DROP POLICY IF EXISTS "pipeline_stages_insert_admin" ON public.pipeline_stages;
DROP POLICY IF EXISTS "pipeline_stages_update_admin" ON public.pipeline_stages;
DROP POLICY IF EXISTS "pipeline_stages_delete_admin" ON public.pipeline_stages;

CREATE POLICY "pipeline_stages_select_all" ON public.pipeline_stages FOR SELECT USING (true);
CREATE POLICY "pipeline_stages_insert_admin" ON public.pipeline_stages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pipeline_stages_update_admin" ON public.pipeline_stages FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pipeline_stages_delete_admin" ON public.pipeline_stages FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.pipeline_stages (name, sort_order, color, is_won, is_lost)
SELECT * FROM (VALUES
  ('Prospecting',   1, '#6366f1', false, false),
  ('Qualification', 2, '#8b5cf6', false, false),
  ('Proposal',      3, '#f59e0b', false, false),
  ('Negotiation',   4, '#f97316', false, false),
  ('Closed Won',    5, '#22c55e', true,  false),
  ('Closed Lost',   6, '#ef4444', false, true)
) AS v(name, sort_order, color, is_won, is_lost)
WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages LIMIT 1);

-- Follow-up sequences
CREATE TABLE IF NOT EXISTS public.follow_up_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sequences_select_approved" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "sequences_insert_admin" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "sequences_update_policy" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "sequences_delete_policy" ON public.follow_up_sequences;

CREATE POLICY "sequences_select_approved" ON public.follow_up_sequences FOR SELECT USING (is_approved(auth.uid()));
CREATE POLICY "sequences_insert_admin" ON public.follow_up_sequences FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());
CREATE POLICY "sequences_update_policy" ON public.follow_up_sequences FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid()) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());
CREATE POLICY "sequences_delete_policy" ON public.follow_up_sequences FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- Follow-up sequence steps
CREATE TABLE IF NOT EXISTS public.follow_up_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  delay_days integer NOT NULL DEFAULT 1,
  type text NOT NULL DEFAULT 'email',
  subject text DEFAULT '',
  content text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_sequence_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sequence_steps_select" ON public.follow_up_sequence_steps;
DROP POLICY IF EXISTS "sequence_steps_insert" ON public.follow_up_sequence_steps;
DROP POLICY IF EXISTS "sequence_steps_update" ON public.follow_up_sequence_steps;
DROP POLICY IF EXISTS "sequence_steps_delete" ON public.follow_up_sequence_steps;

CREATE POLICY "sequence_steps_select" ON public.follow_up_sequence_steps FOR SELECT USING (is_approved(auth.uid()));
CREATE POLICY "sequence_steps_insert" ON public.follow_up_sequence_steps FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.follow_up_sequences s WHERE s.id = follow_up_sequence_steps.sequence_id AND s.created_by = auth.uid()));
CREATE POLICY "sequence_steps_update" ON public.follow_up_sequence_steps FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.follow_up_sequences s WHERE s.id = follow_up_sequence_steps.sequence_id AND s.created_by = auth.uid()));
CREATE POLICY "sequence_steps_delete" ON public.follow_up_sequence_steps FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.follow_up_sequences s WHERE s.id = follow_up_sequence_steps.sequence_id AND s.created_by = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON public.follow_up_sequence_steps (sequence_id, step_order);

-- Triggers
DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_follow_up_sequences_updated_at ON public.follow_up_sequences;
CREATE TRIGGER update_follow_up_sequences_updated_at BEFORE UPDATE ON public.follow_up_sequences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
