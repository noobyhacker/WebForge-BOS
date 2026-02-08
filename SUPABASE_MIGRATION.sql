-- ============================================================
-- CRM Security Migration: Admin Access + Client Sharing
-- Run this in your Supabase SQL Editor
-- Uses IF NOT EXISTS / CREATE OR REPLACE to be idempotent
-- ============================================================

-- 1. Create permission level enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.permission_level AS ENUM ('view', 'edit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create client_shares table for sharing clients with other users
CREATE TABLE IF NOT EXISTS public.client_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission permission_level NOT NULL DEFAULT 'view',
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (client_id, user_id)
);

-- If client_shares already existed, ensure required columns exist (CREATE TABLE IF NOT EXISTS won't add them)
ALTER TABLE public.client_shares
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS permission public.permission_level,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Ensure sane defaults (safe even if columns already had defaults)
ALTER TABLE public.client_shares ALTER COLUMN permission SET DEFAULT 'view';
ALTER TABLE public.client_shares ALTER COLUMN created_at SET DEFAULT now();

-- Enable RLS on client_shares
ALTER TABLE public.client_shares ENABLE ROW LEVEL SECURITY;

-- 3. Create helper functions (SECURITY DEFINER to avoid RLS recursion)

-- Check if user is the owner of a client
CREATE OR REPLACE FUNCTION public.is_client_owner(client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = client_id AND user_id = auth.uid()
  )
$$;

-- Check if user has at least view permission on a client (owner OR shared)
CREATE OR REPLACE FUNCTION public.has_client_access(client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.client_shares WHERE client_id = $1 AND user_id = auth.uid()
  )
$$;

-- Check if user has edit permission on a client (owner OR shared with 'edit')
CREATE OR REPLACE FUNCTION public.has_client_edit_access(client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.client_shares 
    WHERE client_id = $1 AND user_id = auth.uid() AND permission = 'edit'
  )
$$;

-- 4. Drop existing RLS policies on clients (adjust names if different)
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- 5. Create new RLS policies for clients

-- SELECT: Admins see all, owners see their own, shared users see shared clients
CREATE POLICY "clients_select_policy" ON public.clients
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.has_client_access(id)
);

-- INSERT: Any authenticated user can create clients (ownership set via user_id)
CREATE POLICY "clients_insert_policy" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Admins can update all, owners can update their own, shared users with 'edit' can update
CREATE POLICY "clients_update_policy" ON public.clients
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.has_client_edit_access(id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.has_client_edit_access(id)
);

-- DELETE: Only admins and owners can delete
CREATE POLICY "clients_delete_policy" ON public.clients
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);

-- 6. Drop existing RLS policies on follow_ups (adjust names if different)
DROP POLICY IF EXISTS "Users can view their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can insert their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can update their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can delete their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_select_policy" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_insert_policy" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_update_policy" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_delete_policy" ON public.follow_ups;

-- 7. Create new RLS policies for follow_ups (inherit access from parent client)

-- SELECT: Admins see all, otherwise based on client access
CREATE POLICY "follow_ups_select_policy" ON public.follow_ups
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_client_access(client_id)
);

-- INSERT: Admins can insert anywhere, owners/editors can add to their accessible clients
CREATE POLICY "follow_ups_insert_policy" ON public.follow_ups
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_client_edit_access(client_id)
);

-- UPDATE: Admins can update all, owners/editors can update on their accessible clients
CREATE POLICY "follow_ups_update_policy" ON public.follow_ups
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_client_edit_access(client_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_client_edit_access(client_id)
);

-- DELETE: Admins and client owners only
CREATE POLICY "follow_ups_delete_policy" ON public.follow_ups
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_client_owner(client_id)
);

-- 8. RLS policies for client_shares table
DROP POLICY IF EXISTS "client_shares_select_policy" ON public.client_shares;
DROP POLICY IF EXISTS "client_shares_insert_policy" ON public.client_shares;
DROP POLICY IF EXISTS "client_shares_update_policy" ON public.client_shares;
DROP POLICY IF EXISTS "client_shares_delete_policy" ON public.client_shares;

-- SELECT: Admins see all, owners see shares for their clients, shared users see their own shares
CREATE POLICY "client_shares_select_policy" ON public.client_shares
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_client_owner(client_id)
  OR user_id = auth.uid()
);

-- INSERT: Only admins and client owners can share
CREATE POLICY "client_shares_insert_policy" ON public.client_shares
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_client_owner(client_id)
);

-- UPDATE: Only admins and client owners can update share permissions
CREATE POLICY "client_shares_update_policy" ON public.client_shares
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_client_owner(client_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_client_owner(client_id)
);

-- DELETE: Only admins and client owners can remove shares
CREATE POLICY "client_shares_delete_policy" ON public.client_shares
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_client_owner(client_id)
);

-- ============================================================
-- Done! Admins can see all clients/follow-ups.
-- Owners can share their clients with other users (view/edit).
-- ============================================================
