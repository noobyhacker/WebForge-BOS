-- Add reply_to column for reply functionality
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.chat_messages(id);

-- Create a trigger function to send notifications on new chat messages
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _client_name text;
  _sender_name text;
  _recipient_id uuid;
BEGIN
  SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT COALESCE(full_name, email) INTO _sender_name FROM public.profiles WHERE id = NEW.sender_id;

  -- Notify client owner if sender is not the owner
  SELECT user_id INTO _recipient_id FROM public.clients WHERE id = NEW.client_id;
  IF _recipient_id IS NOT NULL AND _recipient_id != NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (_recipient_id, 'New message', _sender_name || ' sent a message about ' || COALESCE(_client_name, 'a client'), 'chat', 'client', NEW.client_id);
  END IF;

  -- Notify all assigned users (except sender and owner)
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT ca.assigned_to, 'New message', _sender_name || ' sent a message about ' || COALESCE(_client_name, 'a client'), 'chat', 'client', NEW.client_id
  FROM public.client_assignments ca
  WHERE ca.client_id = NEW.client_id AND ca.assigned_to != NEW.sender_id AND ca.assigned_to != COALESCE(_recipient_id, '00000000-0000-0000-0000-000000000000');

  -- Notify shared users (except sender, owner, and already-notified assigned)
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT cs.shared_with_user_id, 'New message', _sender_name || ' sent a message about ' || COALESCE(_client_name, 'a client'), 'chat', 'client', NEW.client_id
  FROM public.client_shares cs
  WHERE cs.client_id = NEW.client_id AND cs.shared_with_user_id != NEW.sender_id AND cs.shared_with_user_id != COALESCE(_recipient_id, '00000000-0000-0000-0000-000000000000')
  AND cs.shared_with_user_id NOT IN (SELECT ca2.assigned_to FROM public.client_assignments ca2 WHERE ca2.client_id = NEW.client_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_notification_trigger ON public.chat_messages;
CREATE TRIGGER chat_message_notification_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();

-- Enable realtime for chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;