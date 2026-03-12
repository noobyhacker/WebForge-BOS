
-- 1. Add new permission keys for pipeline, KPIs, all-clients visibility
INSERT INTO permissions (key, description) VALUES
  ('view_pipeline', 'View deals pipeline and stages')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (key, description) VALUES
  ('view_all_clients', 'View all clients including other users'' clients')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (key, description) VALUES
  ('view_kpis', 'View KPI dashboard and metrics')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (key, description) VALUES
  ('assign_kpis', 'Assign KPIs to individual users')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (key, description) VALUES
  ('view_all_deals', 'View all deals across the organization')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (key, description) VALUES
  ('view_all_accounts', 'View all accounts across the organization')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (key, description) VALUES
  ('view_all_contacts', 'View all contacts across the organization')
  ON CONFLICT (key) DO NOTHING;

-- 2. Update RLS on clients: sales_manager can see all, sales can see unclaimed (status='lead' and no specific assignment)
DROP POLICY IF EXISTS clients_select_policy ON clients;
CREATE POLICY clients_select_policy ON clients FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR (user_id = auth.uid())
  OR has_client_access(id)
  OR has_permission(auth.uid(), 'view_all_clients')
);

-- 3. Update RLS on deals: sales_manager can see all
DROP POLICY IF EXISTS deals_select_policy ON deals;
CREATE POLICY deals_select_policy ON deals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR (owner_id = auth.uid())
  OR has_entity_access('deal'::text, id)
  OR has_permission(auth.uid(), 'view_all_deals')
);

-- 4. Update RLS on accounts: sales_manager can see all
DROP POLICY IF EXISTS accounts_select_policy ON accounts;
CREATE POLICY accounts_select_policy ON accounts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR (owner_id = auth.uid())
  OR has_entity_access('account'::text, id)
  OR has_permission(auth.uid(), 'view_all_accounts')
);

-- 5. Update RLS on contacts: sales_manager can see all
DROP POLICY IF EXISTS contacts_select_policy ON contacts;
CREATE POLICY contacts_select_policy ON contacts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR (owner_id = auth.uid())
  OR has_entity_access('contact'::text, id)
  OR has_permission(auth.uid(), 'view_all_contacts')
);

-- 6. Update KPI RLS: all approved users can view KPIs
DROP POLICY IF EXISTS kpis_select_policy ON kpis;
CREATE POLICY kpis_select_policy ON kpis FOR SELECT TO authenticated
USING (is_approved(auth.uid()));

-- 7. Allow managers/admins to update any KPI (for assigning)
DROP POLICY IF EXISTS kpis_update_policy ON kpis;
CREATE POLICY kpis_update_policy ON kpis FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR (owner_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales_manager'::app_role)
  OR (owner_id = auth.uid())
);

-- 8. Add assigned_to column to KPIs for individual assignment
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);
