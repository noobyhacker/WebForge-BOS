ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nationality text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS language text DEFAULT '';