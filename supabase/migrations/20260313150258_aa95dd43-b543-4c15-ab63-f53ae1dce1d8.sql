-- Add file columns to chat_messages for attachments
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_type text;

-- Create chat-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-files', 'chat-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-files bucket
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can view chat files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files');
