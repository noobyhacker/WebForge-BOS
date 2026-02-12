-- ============================================================
-- CRM Expansion Migration – Phase 1
-- Run this in your Supabase SQL Editor
-- Uses IF NOT EXISTS / CREATE OR REPLACE to be idempotent
-- ============================================================

-- ── Enums ──

DO $$ BEGIN CREATE TYPE public.permission_level AS ENUM ('view', 'edit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contact_status AS ENUM ('active', 'inactive', 'prospect'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.deal_stage AS ENUM ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'task'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.activity_status AS ENUM ('pending', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Existing tables (client_shares) ──

CREATE TABLE IF NOT EXISTS public.client_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission permission_level NOT NULL DEFAULT 'view',
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (client_id, user_id)
);

ALTER TABLE public.client_shares
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS permission public.permission_level,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.client_shares ALTER COLUMN permission SET DEFAULT 'view';
ALTER TABLE public.client_shares ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.client_shares ENABLE ROW LEVEL SECURITY;

-- ── New Tables ──

-- Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text DEFAULT '',
  website text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  status public.contact_status DEFAULT 'prospect' NOT NULL,
  source text DEFAULT '',
  title text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Deals
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  stage public.deal_stage DEFAULT 'prospecting' NOT NULL,
  value numeric(12,2) DEFAULT 0,
  probability int DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.activity_type NOT NULL DEFAULT 'task',
  subject text NOT NULL,
  description text DEFAULT '',
  entity_type text DEFAULT '',
  entity_id uuid,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  due_date timestamptz,
  completed_at timestamptz,
  status public.activity_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) DEFAULT 0,
  sku text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ── Action Logs columns ──

ALTER TABLE public.action_logs
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS entity_data text;

-- ── Helper Functions (SECURITY DEFINER) ──

CREATE OR REPLACE FUNCTION public.is_client_owner(client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.has_client_access(client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.client_shares WHERE client_id = $1 AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.has_client_edit_access(client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.client_shares WHERE client_id = $1 AND user_id = auth.uid() AND permission = 'edit')
$$;

-- Generic owner check
CREATE OR REPLACE FUNCTION public.is_owner(_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner_id = auth.uid()
$$;

-- ── RLS Policies: Clients ──

DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

CREATE POLICY "clients_select_policy" ON public.clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid() OR public.has_client_access(id));

CREATE POLICY "clients_insert_policy" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "clients_update_policy" ON public.clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid() OR public.has_client_edit_access(id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid() OR public.has_client_edit_access(id));

CREATE POLICY "clients_delete_policy" ON public.clients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- ── RLS Policies: Follow-ups ──

DROP POLICY IF EXISTS "Users can view their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can insert their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can update their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can delete their own follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_select_policy" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_insert_policy" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_update_policy" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_delete_policy" ON public.follow_ups;

CREATE POLICY "follow_ups_select_policy" ON public.follow_ups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_client_access(client_id));

CREATE POLICY "follow_ups_insert_policy" ON public.follow_ups FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_client_edit_access(client_id));

CREATE POLICY "follow_ups_update_policy" ON public.follow_ups FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_client_edit_access(client_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_client_edit_access(client_id));

CREATE POLICY "follow_ups_delete_policy" ON public.follow_ups FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_client_owner(client_id));

-- ── RLS Policies: Client Shares ──

DROP POLICY IF EXISTS "client_shares_select_policy" ON public.client_shares;
DROP POLICY IF EXISTS "client_shares_insert_policy" ON public.client_shares;
DROP POLICY IF EXISTS "client_shares_update_policy" ON public.client_shares;
DROP POLICY IF EXISTS "client_shares_delete_policy" ON public.client_shares;

CREATE POLICY "client_shares_select_policy" ON public.client_shares FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_client_owner(client_id) OR user_id = auth.uid());

CREATE POLICY "client_shares_insert_policy" ON public.client_shares FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_client_owner(client_id));

CREATE POLICY "client_shares_update_policy" ON public.client_shares FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_client_owner(client_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_client_owner(client_id));

CREATE POLICY "client_shares_delete_policy" ON public.client_shares FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_client_owner(client_id));

-- ── RLS Policies: Accounts ──

DROP POLICY IF EXISTS "accounts_select_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete_policy" ON public.accounts;

CREATE POLICY "accounts_select_policy" ON public.accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "accounts_insert_policy" ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "accounts_update_policy" ON public.accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "accounts_delete_policy" ON public.accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

-- ── RLS Policies: Contacts ──

DROP POLICY IF EXISTS "contacts_select_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON public.contacts;

CREATE POLICY "contacts_select_policy" ON public.contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "contacts_insert_policy" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "contacts_update_policy" ON public.contacts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "contacts_delete_policy" ON public.contacts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

-- ── RLS Policies: Deals ──

DROP POLICY IF EXISTS "deals_select_policy" ON public.deals;
DROP POLICY IF EXISTS "deals_insert_policy" ON public.deals;
DROP POLICY IF EXISTS "deals_update_policy" ON public.deals;
DROP POLICY IF EXISTS "deals_delete_policy" ON public.deals;

CREATE POLICY "deals_select_policy" ON public.deals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "deals_insert_policy" ON public.deals FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "deals_update_policy" ON public.deals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "deals_delete_policy" ON public.deals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

-- ── RLS Policies: Activities ──

DROP POLICY IF EXISTS "activities_select_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_insert_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_update_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_delete_policy" ON public.activities;

CREATE POLICY "activities_select_policy" ON public.activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "activities_insert_policy" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "activities_update_policy" ON public.activities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "activities_delete_policy" ON public.activities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

-- ── RLS Policies: Products (all authenticated can view, admin can edit) ──

DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "products_delete_policy" ON public.products;

CREATE POLICY "products_select_policy" ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_insert_policy" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "products_update_policy" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "products_delete_policy" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Updated_at trigger function ──

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Phase 3: Notes + Email Templates
-- ============================================================

-- Notes (polymorphic – attachable to any entity)
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_delete_policy" ON public.notes;

CREATE POLICY "notes_select_policy" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_insert_policy" ON public.notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes_delete_policy" ON public.notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR author_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text DEFAULT '',
  body text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_select_policy" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_insert_policy" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_update_policy" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_delete_policy" ON public.email_templates;

CREATE POLICY "email_templates_select_policy" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_templates_insert_policy" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "email_templates_update_policy" ON public.email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "email_templates_delete_policy" ON public.email_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Phase 4: Automation Engine + Lead Scoring
-- ============================================================

-- Automation Rules (admin-only)
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  entity_type text NOT NULL DEFAULT 'deal',
  trigger_type text NOT NULL DEFAULT 'record_created',
  trigger_config jsonb DEFAULT '{}',
  action_type text NOT NULL DEFAULT 'create_task',
  action_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_rules_select_policy" ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules_insert_policy" ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules_update_policy" ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules_delete_policy" ON public.automation_rules;

CREATE POLICY "automation_rules_select_policy" ON public.automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "automation_rules_insert_policy" ON public.automation_rules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "automation_rules_update_policy" ON public.automation_rules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "automation_rules_delete_policy" ON public.automation_rules FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lead Scoring Rules (admin-only management, all can view)
CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  field text NOT NULL,
  operator text NOT NULL DEFAULT 'equals',
  value text DEFAULT '',
  points int NOT NULL DEFAULT 0,
  entity_type text NOT NULL DEFAULT 'client',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_scoring_rules_select_policy" ON public.lead_scoring_rules;
DROP POLICY IF EXISTS "lead_scoring_rules_insert_policy" ON public.lead_scoring_rules;
DROP POLICY IF EXISTS "lead_scoring_rules_update_policy" ON public.lead_scoring_rules;
DROP POLICY IF EXISTS "lead_scoring_rules_delete_policy" ON public.lead_scoring_rules;

CREATE POLICY "lead_scoring_rules_select_policy" ON public.lead_scoring_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_scoring_rules_insert_policy" ON public.lead_scoring_rules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lead_scoring_rules_update_policy" ON public.lead_scoring_rules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lead_scoring_rules_delete_policy" ON public.lead_scoring_rules FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lead_scoring_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Done! Run this migration in your Supabase SQL Editor.
-- ============================================================
