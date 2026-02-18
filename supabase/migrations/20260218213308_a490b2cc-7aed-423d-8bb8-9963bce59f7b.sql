
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS target_entity text NOT NULL DEFAULT 'client';
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS target_field text NOT NULL DEFAULT '';
