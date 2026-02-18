
-- ═══════════════════════════════════════════════════════════
-- BOS v1.1 Migration: Tasks, Entity Comments, Permissions, RBAC
-- ═══════════════════════════════════════════════════════════

-- 1. Extend app_role enum with finance and viewer
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  assigned_to uuid NOT NULL,
  created_by uuid NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks RLS
CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT
  WITH CHECK (
    is_approved(auth.uid()) AND created_by = auth.uid()
  );

CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
  );

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks (assigned_to, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON public.tasks (related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date, status);

-- Tasks updated_at trigger
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create entity_comments table
CREATE TABLE IF NOT EXISTS public.entity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_comments ENABLE ROW LEVEL SECURITY;

-- Entity comments RLS
CREATE POLICY "entity_comments_select_policy" ON public.entity_comments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_approved(auth.uid())
  );

CREATE POLICY "entity_comments_insert_policy" ON public.entity_comments FOR INSERT
  WITH CHECK (
    is_approved(auth.uid()) AND user_id = auth.uid()
  );

CREATE POLICY "entity_comments_delete_policy" ON public.entity_comments FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
  );

-- Entity comments index
CREATE INDEX IF NOT EXISTS idx_entity_comments_entity ON public.entity_comments (entity_type, entity_id, created_at);

-- 4. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select_policy" ON public.permissions FOR SELECT
  USING (true);

CREATE POLICY "permissions_insert_policy" ON public.permissions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "permissions_update_policy" ON public.permissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "permissions_delete_policy" ON public.permissions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_policy" ON public.role_permissions FOR SELECT
  USING (true);

CREATE POLICY "role_permissions_insert_policy" ON public.role_permissions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "role_permissions_update_policy" ON public.role_permissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "role_permissions_delete_policy" ON public.role_permissions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Create has_permission security definer function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN _user_id IS NULL THEN false
  ELSE EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.key = _permission_key
  )
  END
$$;
