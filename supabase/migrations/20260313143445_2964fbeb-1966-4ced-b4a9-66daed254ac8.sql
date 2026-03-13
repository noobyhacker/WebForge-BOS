
-- 1. Client assignments table (manager assigns client to sales assistant)
CREATE TABLE IF NOT EXISTS public.client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES auth.users(id),
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  pinned_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_select_policy" ON public.client_assignments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR assigned_to = auth.uid()
  OR assigned_by = auth.uid()
);

CREATE POLICY "assignment_insert_policy" ON public.client_assignments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR has_permission(auth.uid(), 'assign_clients')
);

CREATE POLICY "assignment_update_policy" ON public.client_assignments FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR assigned_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR assigned_by = auth.uid()
);

CREATE POLICY "assignment_delete_policy" ON public.client_assignments FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR assigned_by = auth.uid()
);

-- 2. Pinned files for client assignments
CREATE TABLE IF NOT EXISTS public.client_assignment_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.client_assignments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT '',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_assignment_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_files_select" ON public.client_assignment_files FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.client_assignments ca WHERE ca.id = assignment_id AND ca.assigned_to = auth.uid())
);

CREATE POLICY "assignment_files_insert" ON public.client_assignment_files FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "assignment_files_delete" ON public.client_assignment_files FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR uploaded_by = auth.uid()
);

-- 3. Chat messages table (client-context chat)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Admin can see all chats
CREATE POLICY "chat_select_admin" ON public.chat_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR sender_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.client_assignments ca WHERE ca.client_id = chat_messages.client_id AND ca.assigned_to = auth.uid())
  OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = chat_messages.client_id AND c.user_id = auth.uid())
);

CREATE POLICY "chat_insert" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_approved(auth.uid())
);

-- 4. Add assign_clients permission
INSERT INTO permissions (key, description) VALUES
  ('assign_clients', 'Assign clients to sales assistants')
  ON CONFLICT (key) DO NOTHING;

-- 5. Storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assignment files
CREATE POLICY "assignment_files_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignment-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "assignment_files_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignment-files');

CREATE POLICY "assignment_files_delete_storage" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assignment-files' AND (storage.foldername(name))[1] = auth.uid()::text);
