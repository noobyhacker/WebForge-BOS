-- Cold call tracking
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cold_call_status text DEFAULT 'not_called',
  ADD COLUMN IF NOT EXISTS cold_call_last_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cold_call_notes text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_clients_cold_call_status ON public.clients(cold_call_status) WHERE deleted_at IS NULL;