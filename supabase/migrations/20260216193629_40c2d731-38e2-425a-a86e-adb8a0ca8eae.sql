
-- 1. Add missing profiles UPDATE policy (admins can update any, users can update own non-approval fields)
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (id = auth.uid() AND is_approved IS NOT DISTINCT FROM (SELECT p.is_approved FROM public.profiles p WHERE p.id = auth.uid()))
  );

-- 2. Add missing profiles DELETE policy (admin only)
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix notes SELECT to also allow entity access for collaboration
DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;
CREATE POLICY "notes_select_policy" ON public.notes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR author_id = auth.uid()
    OR has_entity_access(entity_type, entity_id)
  );
