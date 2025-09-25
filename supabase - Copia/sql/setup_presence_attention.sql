-- === Realtime + TTL + Delete definitivo + Atenção só para online + RLS perfis ===
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='attention_calls'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.attention_calls';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_auto_delete_at ON public.messages(auto_delete_at);

CREATE OR REPLACE FUNCTION public.set_message_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewed_at IS NOT NULL AND (OLD.viewed_at IS DISTINCT FROM NEW.viewed_at) THEN
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := now() + interval '2 minutes';
    END IF;
    NEW.auto_delete_at := NEW.expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_message_expiry ON public.messages;
CREATE TRIGGER trg_set_message_expiry BEFORE UPDATE OF viewed_at ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_message_expiry();

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete_expired_messages') THEN
    PERFORM cron.schedule('delete_expired_messages', '*/1 * * * *',
      $$DELETE FROM public.messages WHERE auto_delete_at IS NOT NULL AND auto_delete_at <= now();$$);
  END IF;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='message_files_message_id_fkey'
      AND table_schema='public' AND table_name='message_files'
  ) THEN
    ALTER TABLE public.message_files
      ADD CONSTRAINT message_files_message_id_fkey
      FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_message_for_both(p_message_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender uuid; v_receiver uuid;
BEGIN
  SELECT sender_id, receiver_id INTO v_sender, v_receiver FROM public.messages WHERE id = p_message_id;
  IF v_sender IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF auth.uid() IS DISTINCT FROM v_sender AND auth.uid() IS DISTINCT FROM v_receiver THEN
    RAISE EXCEPTION 'Not allowed to delete this message';
  END IF;
  DELETE FROM public.messages WHERE id = p_message_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_message_for_both(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_attention_to_offline()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.receiver_id AND status <> 'online') THEN
    RAISE EXCEPTION 'Receiver is offline';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_attention_to_offline ON public.attention_calls;
CREATE TRIGGER trg_prevent_attention_to_offline BEFORE INSERT ON public.attention_calls FOR EACH ROW EXECUTE FUNCTION public.prevent_attention_to_offline();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
