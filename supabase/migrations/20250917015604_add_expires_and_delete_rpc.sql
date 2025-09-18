-- Add expires_at to messages and RPC to delete for both users after expiry
ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create a function to allow either sender or receiver to delete a message by id
-- Only if the authenticated user is sender or receiver
-- Optionally enforce that expires_at <= now() if set
CREATE OR REPLACE FUNCTION public.delete_message_for_both(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sender uuid;
  v_receiver uuid;
  v_expires timestamptz;
BEGIN
  SELECT sender_id, receiver_id, expires_at
    INTO v_sender, v_receiver, v_expires
  FROM public.messages
  WHERE id = p_message_id;

  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Ensure caller is a participant
  IF auth.uid() IS DISTINCT FROM v_sender AND auth.uid() IS DISTINCT FROM v_receiver THEN
    RAISE EXCEPTION 'Not authorized to delete this message';
  END IF;

  -- If expires_at is set, only allow after expiry time
  IF v_expires IS NOT NULL AND v_expires > now() THEN
    RAISE EXCEPTION 'Message not yet expired';
  END IF;

  DELETE FROM public.messages WHERE id = p_message_id;
END;
$$;

-- Helpful index
CREATE INDEX IF NOT EXISTS messages_expires_at_idx ON public.messages (expires_at);