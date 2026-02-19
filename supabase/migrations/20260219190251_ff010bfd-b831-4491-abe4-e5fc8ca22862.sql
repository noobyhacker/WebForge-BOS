
-- Create KPIs table for tracking key performance indicators
CREATE TABLE public.kpis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  unit text NOT NULL DEFAULT 'number',
  target_value numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  owner_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "kpis_select_policy" ON public.kpis
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR owner_id = auth.uid());

CREATE POLICY "kpis_insert_policy" ON public.kpis
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "kpis_update_policy" ON public.kpis
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR owner_id = auth.uid());

CREATE POLICY "kpis_delete_policy" ON public.kpis
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR owner_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_kpis_updated_at
  BEFORE UPDATE ON public.kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
