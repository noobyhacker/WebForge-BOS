
-- Allow sales_manager to see all tasks (for assigning and tracking)
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'sales_manager'::app_role)
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- Allow sales_manager to update any task (for reassignment)
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'sales_manager'::app_role)
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- Allow sales_manager to create tasks for anyone
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT WITH CHECK (
    is_approved(auth.uid()) AND created_by = auth.uid()
  );
