-- Allow contacts created via external forms to have no owner initially
ALTER TABLE public.contacts ALTER COLUMN owner_id DROP NOT NULL;