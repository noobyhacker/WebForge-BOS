
-- Add admin-only SELECT policy for job_queue
CREATE POLICY "job_queue_select_admin"
ON public.job_queue
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
