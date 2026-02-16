
-- Drop dependent policies first, then recreate has_client_access with proper params
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "follow_ups_select_policy" ON public.follow_ups;

-- Now drop the old function
DROP FUNCTION IF EXISTS public.has_client_access(uuid);

-- Recreate with proper parameter name and null check
CREATE FUNCTION public.has_client_access(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN false
  ELSE (
    EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.client_shares WHERE client_id = _client_id AND shared_with_user_id = auth.uid())
  )
  END
$$;

-- Recreate dropped policies
CREATE POLICY "clients_select_policy" ON public.clients
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR (user_id = auth.uid()) OR has_client_access(id));

CREATE POLICY "follow_ups_select_policy" ON public.follow_ups
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_client_access(client_id));

-- Fix has_client_access(uuid, uuid) with null check
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN _user_id IS NULL THEN false
  ELSE (
    EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.client_shares WHERE client_id = _client_id AND shared_with_user_id = _user_id)
  )
  END
$$;

-- Fix other SECURITY DEFINER functions with null checks
CREATE OR REPLACE FUNCTION public.is_owner(_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN false ELSE _owner_id = auth.uid() END
$$;

CREATE OR REPLACE FUNCTION public.is_client_owner(client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN false
  ELSE EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid())
  END
$$;

CREATE OR REPLACE FUNCTION public.has_client_edit_access(client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN false
  ELSE (
    EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.client_shares WHERE client_id = client_id AND shared_with_user_id = auth.uid() AND permission = 'edit')
  )
  END
$$;

CREATE OR REPLACE FUNCTION public.can_edit_client(_user_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN _user_id IS NULL THEN false
  ELSE (
    EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.client_shares WHERE client_id = _client_id AND shared_with_user_id = _user_id AND permission = 'edit')
  )
  END
$$;

CREATE OR REPLACE FUNCTION public.has_entity_access(_entity_type text, _entity_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN false
  ELSE EXISTS (
    SELECT 1 FROM public.entity_shares
    WHERE entity_type = _entity_type AND entity_id = _entity_id AND user_id = auth.uid()
  )
  END
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN _user_id IS NULL THEN false
  ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE WHEN _user_id IS NULL THEN false
  ELSE COALESCE((SELECT is_approved FROM public.profiles WHERE id = _user_id), FALSE)
  END
$$;

-- Fix search_path on trigger functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;
