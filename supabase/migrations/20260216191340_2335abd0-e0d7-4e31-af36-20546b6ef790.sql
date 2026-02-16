
-- 1. Profiles: Allow approved users to see other approved users (needed for sharing)
CREATE POLICY "Approved users can view approved profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  is_approved(auth.uid()) AND is_approved(id)
);

-- 2. Email templates: restrict INSERT/UPDATE to creator or admin
DROP POLICY IF EXISTS "email_templates_insert_policy" ON public.email_templates;
CREATE POLICY "email_templates_insert_policy" ON public.email_templates
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "email_templates_update_policy" ON public.email_templates;
CREATE POLICY "email_templates_update_policy" ON public.email_templates
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- 3. Documents: restrict SELECT to uploader, admin, or entity access
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
CREATE POLICY "documents_select_policy" ON public.documents
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR uploaded_by = auth.uid()
  OR has_entity_access(entity_type, entity_id)
);

-- 4. Deal stage history: restrict to deal owner/admin
DROP POLICY IF EXISTS "deal_stage_history_select_policy" ON public.deal_stage_history;
CREATE POLICY "deal_stage_history_select_policy" ON public.deal_stage_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM deals d WHERE d.id = deal_id AND d.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "deal_stage_history_insert_policy" ON public.deal_stage_history;
CREATE POLICY "deal_stage_history_insert_policy" ON public.deal_stage_history
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM deals d WHERE d.id = deal_id AND d.owner_id = auth.uid())
);

-- 5. Quote line items: restrict via parent quote ownership
DROP POLICY IF EXISTS "quote_line_items_select_policy" ON public.quote_line_items;
CREATE POLICY "quote_line_items_select_policy" ON public.quote_line_items
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "quote_line_items_insert_policy" ON public.quote_line_items;
CREATE POLICY "quote_line_items_insert_policy" ON public.quote_line_items
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "quote_line_items_delete_policy" ON public.quote_line_items;
CREATE POLICY "quote_line_items_delete_policy" ON public.quote_line_items
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.owner_id = auth.uid())
);

-- 6. Invoice line items: restrict via parent invoice ownership
DROP POLICY IF EXISTS "invoice_line_items_select_policy" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_select_policy" ON public.invoice_line_items
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "invoice_line_items_insert_policy" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_insert_policy" ON public.invoice_line_items
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "invoice_line_items_delete_policy" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_delete_policy" ON public.invoice_line_items
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.owner_id = auth.uid())
);

-- 7. Custom field values: restrict to admin (fields are admin-managed)
DROP POLICY IF EXISTS "custom_field_values_select_policy" ON public.custom_field_values;
CREATE POLICY "custom_field_values_select_policy" ON public.custom_field_values
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "custom_field_values_insert_policy" ON public.custom_field_values;
CREATE POLICY "custom_field_values_insert_policy" ON public.custom_field_values
FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()));

DROP POLICY IF EXISTS "custom_field_values_update_policy" ON public.custom_field_values;
CREATE POLICY "custom_field_values_update_policy" ON public.custom_field_values
FOR UPDATE TO authenticated
USING (is_approved(auth.uid()))
WITH CHECK (is_approved(auth.uid()));

DROP POLICY IF EXISTS "custom_field_values_delete_policy" ON public.custom_field_values;
CREATE POLICY "custom_field_values_delete_policy" ON public.custom_field_values
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';
