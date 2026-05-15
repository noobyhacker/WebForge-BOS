DROP POLICY IF EXISTS cch_insert ON public.cold_call_history;
DROP POLICY IF EXISTS cch_select ON public.cold_call_history;

CREATE POLICY cch_insert ON public.cold_call_history
FOR INSERT TO authenticated
WITH CHECK (
  is_approved(auth.uid())
  AND changed_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_lead_access(auth.uid(), client_id)
    OR EXISTS (SELECT 1 FROM public.client_assignments ca WHERE ca.client_id = cold_call_history.client_id AND ca.assigned_to = auth.uid())
  )
);

CREATE POLICY cch_select ON public.cold_call_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_lead_access(auth.uid(), client_id)
  OR EXISTS (SELECT 1 FROM public.client_assignments ca WHERE ca.client_id = cold_call_history.client_id AND ca.assigned_to = auth.uid())
);