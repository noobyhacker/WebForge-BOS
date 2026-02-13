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
-- Phase 5: Quotes, Invoices, Documents
-- ============================================================

-- Quotes
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL DEFAULT ('QT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4)),
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  deal_name text DEFAULT '',
  account_name text DEFAULT '',
  contact_name text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  subtotal numeric(12,2) DEFAULT 0,
  total_discount numeric(12,2) DEFAULT 0,
  total_tax numeric(12,2) DEFAULT 0,
  grand_total numeric(12,2) DEFAULT 0,
  notes text DEFAULT '',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;

CREATE POLICY "quotes_select_policy" ON public.quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());
CREATE POLICY "quotes_insert_policy" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "quotes_update_policy" ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());
CREATE POLICY "quotes_delete_policy" ON public.quotes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Quote Line Items
CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  description text DEFAULT '',
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) DEFAULT 0,
  tax numeric(10,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_line_items_select_policy" ON public.quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_insert_policy" ON public.quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_delete_policy" ON public.quote_line_items;

CREATE POLICY "quote_line_items_select_policy" ON public.quote_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "quote_line_items_insert_policy" ON public.quote_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "quote_line_items_delete_policy" ON public.quote_line_items FOR DELETE TO authenticated USING (true);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL DEFAULT ('INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4)),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  deal_name text DEFAULT '',
  account_name text DEFAULT '',
  contact_name text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date DEFAULT (CURRENT_DATE + interval '30 days'),
  subtotal numeric(12,2) DEFAULT 0,
  total_tax numeric(12,2) DEFAULT 0,
  grand_total numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  notes text DEFAULT '',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete_policy" ON public.invoices;

CREATE POLICY "invoices_select_policy" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());
CREATE POLICY "invoices_insert_policy" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "invoices_update_policy" ON public.invoices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());
CREATE POLICY "invoices_delete_policy" ON public.invoices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  description text DEFAULT '',
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) DEFAULT 0,
  tax numeric(10,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_line_items_select_policy" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert_policy" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete_policy" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_select_policy" ON public.invoice_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoice_line_items_insert_policy" ON public.invoice_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoice_line_items_delete_policy" ON public.invoice_line_items FOR DELETE TO authenticated USING (true);

-- Documents metadata table (files stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT '',
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;

CREATE POLICY "documents_select_policy" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert_policy" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "documents_delete_policy" ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;

CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');
CREATE POLICY "documents_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- ============================================================
-- Phase 6: Custom Fields
-- ============================================================

-- Custom Field Definitions
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  entity_type text NOT NULL DEFAULT 'client',
  options jsonb DEFAULT '[]',
  is_required boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_fields_select_policy" ON public.custom_fields;
DROP POLICY IF EXISTS "custom_fields_insert_policy" ON public.custom_fields;
DROP POLICY IF EXISTS "custom_fields_update_policy" ON public.custom_fields;
DROP POLICY IF EXISTS "custom_fields_delete_policy" ON public.custom_fields;

CREATE POLICY "custom_fields_select_policy" ON public.custom_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_fields_insert_policy" ON public.custom_fields FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "custom_fields_update_policy" ON public.custom_fields FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "custom_fields_delete_policy" ON public.custom_fields FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.custom_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Custom Field Values
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid REFERENCES public.custom_fields(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid NOT NULL,
  value text DEFAULT '',
  UNIQUE (field_id, entity_id)
);
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_field_values_select_policy" ON public.custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_insert_policy" ON public.custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_update_policy" ON public.custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_delete_policy" ON public.custom_field_values;

CREATE POLICY "custom_field_values_select_policy" ON public.custom_field_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_field_values_insert_policy" ON public.custom_field_values FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "custom_field_values_update_policy" ON public.custom_field_values FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "custom_field_values_delete_policy" ON public.custom_field_values FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Phase 7: Security Hardening
-- ============================================================

-- Entity Shares (generic sharing for contacts, accounts, deals)
CREATE TABLE IF NOT EXISTS public.entity_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission text NOT NULL DEFAULT 'view',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (entity_type, entity_id, user_id)
);
ALTER TABLE public.entity_shares ENABLE ROW LEVEL SECURITY;

-- Helper function for entity share access
CREATE OR REPLACE FUNCTION public.has_entity_access(_entity_type text, _entity_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entity_shares
    WHERE entity_type = _entity_type AND entity_id = _entity_id AND user_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "entity_shares_select_policy" ON public.entity_shares;
DROP POLICY IF EXISTS "entity_shares_insert_policy" ON public.entity_shares;
DROP POLICY IF EXISTS "entity_shares_update_policy" ON public.entity_shares;
DROP POLICY IF EXISTS "entity_shares_delete_policy" ON public.entity_shares;

CREATE POLICY "entity_shares_select_policy" ON public.entity_shares FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "entity_shares_insert_policy" ON public.entity_shares FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
CREATE POLICY "entity_shares_update_policy" ON public.entity_shares FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
CREATE POLICY "entity_shares_delete_policy" ON public.entity_shares FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- Field Permissions (admin-managed)
CREATE TABLE IF NOT EXISTS public.field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  field_name text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (entity_type, field_name, role)
);
ALTER TABLE public.field_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "field_permissions_select_policy" ON public.field_permissions;
DROP POLICY IF EXISTS "field_permissions_insert_policy" ON public.field_permissions;
DROP POLICY IF EXISTS "field_permissions_update_policy" ON public.field_permissions;
DROP POLICY IF EXISTS "field_permissions_delete_policy" ON public.field_permissions;

CREATE POLICY "field_permissions_select_policy" ON public.field_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "field_permissions_insert_policy" ON public.field_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "field_permissions_update_policy" ON public.field_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "field_permissions_delete_policy" ON public.field_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.field_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sharing Groups
CREATE TABLE IF NOT EXISTS public.sharing_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  member_ids jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.sharing_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sharing_groups_select_policy" ON public.sharing_groups;
DROP POLICY IF EXISTS "sharing_groups_insert_policy" ON public.sharing_groups;
DROP POLICY IF EXISTS "sharing_groups_update_policy" ON public.sharing_groups;
DROP POLICY IF EXISTS "sharing_groups_delete_policy" ON public.sharing_groups;

CREATE POLICY "sharing_groups_select_policy" ON public.sharing_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "sharing_groups_insert_policy" ON public.sharing_groups FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sharing_groups_update_policy" ON public.sharing_groups FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sharing_groups_delete_policy" ON public.sharing_groups FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sharing_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update RLS on contacts, accounts, deals to include entity_shares access
-- Contacts: add shared access
DROP POLICY IF EXISTS "contacts_select_policy" ON public.contacts;
CREATE POLICY "contacts_select_policy" ON public.contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid() OR public.has_entity_access('contact', id));

-- Accounts: add shared access
DROP POLICY IF EXISTS "accounts_select_policy" ON public.accounts;
CREATE POLICY "accounts_select_policy" ON public.accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid() OR public.has_entity_access('account', id));

-- Deals: add shared access
DROP POLICY IF EXISTS "deals_select_policy" ON public.deals;
CREATE POLICY "deals_select_policy" ON public.deals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid() OR public.has_entity_access('deal', id));

-- ============================================================
-- Phase 8: Sales Roles
-- ============================================================

-- Add sales and sales_manager to the app_role enum
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Phase 9: Deal Stage History & Lost Reason
-- ============================================================

-- Add lost_reason column to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS lost_reason text DEFAULT '';

-- Deal stage history table
CREATE TABLE IF NOT EXISTS public.deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_stage_history_select_policy" ON public.deal_stage_history;
DROP POLICY IF EXISTS "deal_stage_history_insert_policy" ON public.deal_stage_history;

CREATE POLICY "deal_stage_history_select_policy" ON public.deal_stage_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "deal_stage_history_insert_policy" ON public.deal_stage_history FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- Done! Run this migration in your Supabase SQL Editor.
-- ============================================================
