CREATE TABLE IF NOT EXISTS public.cold_call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text DEFAULT '',
  changed_by uuid,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cold_call_history_client ON public.cold_call_history(client_id, created_at DESC);

ALTER TABLE public.cold_call_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cch_select ON public.cold_call_history;
CREATE POLICY cch_select ON public.cold_call_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_lead_access(auth.uid(), client_id));

DROP POLICY IF EXISTS cch_insert ON public.cold_call_history;
CREATE POLICY cch_insert ON public.cold_call_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()) AND (changed_by = auth.uid()) AND public.has_lead_access(auth.uid(), client_id));