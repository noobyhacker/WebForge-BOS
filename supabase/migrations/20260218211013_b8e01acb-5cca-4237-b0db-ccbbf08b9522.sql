
-- Seed permissions
INSERT INTO public.permissions (key, description) VALUES
  ('view_dashboard', 'Access the main dashboard'),
  ('view_revenue', 'View revenue analytics and leakage'),
  ('view_reports', 'Access reporting views'),
  ('manage_clients', 'Create and edit clients'),
  ('delete_client', 'Delete clients'),
  ('manage_deals', 'Create and edit deals'),
  ('delete_deal', 'Delete deals'),
  ('manage_invoices', 'Create and edit invoices'),
  ('delete_invoice', 'Delete invoices'),
  ('manage_quotes', 'Create and edit quotes'),
  ('delete_quote', 'Delete quotes'),
  ('manage_tasks', 'Create and edit tasks'),
  ('delete_task', 'Delete tasks'),
  ('manage_users', 'Manage user accounts and roles'),
  ('restore_trash', 'Restore soft-deleted records')
ON CONFLICT (key) DO NOTHING;

-- Seed role_permissions for admin (all permissions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- sales_manager: view_dashboard, view_revenue, view_reports, manage_clients, delete_client, manage_deals, delete_deal, manage_quotes, manage_tasks, delete_task, manage_invoices
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'sales_manager'::app_role, id FROM public.permissions
WHERE key IN ('view_dashboard','view_revenue','view_reports','manage_clients','delete_client','manage_deals','delete_deal','manage_quotes','manage_tasks','delete_task','manage_invoices')
ON CONFLICT (role, permission_id) DO NOTHING;

-- sales: view_dashboard, manage_clients, manage_deals, manage_quotes, manage_tasks
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'sales'::app_role, id FROM public.permissions
WHERE key IN ('view_dashboard','manage_clients','manage_deals','manage_quotes','manage_tasks')
ON CONFLICT (role, permission_id) DO NOTHING;

-- finance: view_dashboard, view_revenue, view_reports, manage_invoices, manage_tasks
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'finance'::app_role, id FROM public.permissions
WHERE key IN ('view_dashboard','view_revenue','view_reports','manage_invoices','manage_tasks')
ON CONFLICT (role, permission_id) DO NOTHING;

-- viewer: view_dashboard, view_revenue, view_reports
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer'::app_role, id FROM public.permissions
WHERE key IN ('view_dashboard','view_revenue','view_reports')
ON CONFLICT (role, permission_id) DO NOTHING;

-- user: view_dashboard, manage_clients, manage_deals, manage_quotes, manage_tasks
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user'::app_role, id FROM public.permissions
WHERE key IN ('view_dashboard','manage_clients','manage_deals','manage_quotes','manage_tasks')
ON CONFLICT (role, permission_id) DO NOTHING;
