
-- Fix notes SELECT policy: restrict to author or admin
DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;
CREATE POLICY "notes_select_policy" ON public.notes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR author_id = auth.uid()
  );

-- Fix custom_field_values SELECT policy: restrict to approved users
DROP POLICY IF EXISTS "custom_field_values_select_policy" ON public.custom_field_values;
CREATE POLICY "custom_field_values_select_policy" ON public.custom_field_values
  FOR SELECT TO authenticated
  USING (is_approved(auth.uid()));

-- Fix storage objects SELECT policy for documents bucket
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (auth.uid())::text = (storage.foldername(name))[1]
    )
  );
