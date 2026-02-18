
-- Forms table
CREATE TABLE IF NOT EXISTS public.forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forms_select_approved" ON public.forms FOR SELECT USING (is_approved(auth.uid()));
CREATE POLICY "forms_insert_admin" ON public.forms FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales_manager'::app_role));
CREATE POLICY "forms_update_admin" ON public.forms FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid()) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());
CREATE POLICY "forms_delete_admin" ON public.forms FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- Form fields table
CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_fields_select_approved" ON public.form_fields FOR SELECT USING (is_approved(auth.uid()));
CREATE POLICY "form_fields_insert_admin" ON public.form_fields FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales_manager'::app_role));
CREATE POLICY "form_fields_update_admin" ON public.form_fields FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales_manager'::app_role));
CREATE POLICY "form_fields_delete_admin" ON public.form_fields FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales_manager'::app_role));

-- Form submissions tracking table
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  lead_id uuid,
  source text DEFAULT 'form',
  page_url text DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text DEFAULT ''
);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_submissions_select_approved" ON public.form_submissions FOR SELECT USING (is_approved(auth.uid()));

-- Webhook API keys table
CREATE TABLE IF NOT EXISTS public.webhook_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  api_key text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE public.webhook_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_api_keys_select_admin" ON public.webhook_api_keys FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "webhook_api_keys_insert_admin" ON public.webhook_api_keys FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "webhook_api_keys_update_admin" ON public.webhook_api_keys FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "webhook_api_keys_delete_admin" ON public.webhook_api_keys FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
