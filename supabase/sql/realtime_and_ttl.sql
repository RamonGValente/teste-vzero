-- realtime + TTL auto-delete para mensagens e attention_calls

-- 1) Publicação realtime (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='attention_calls'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.attention_calls';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='typing_status'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status';
  END IF;
END $$;

-- 2) Índices úteis
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_auto_delete_at ON public.messages(auto_delete_at);

-- 3) Trigger: definir expiração automaticamente quando viewed_at mudar
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
CREATE TRIGGER trg_set_message_expiry
BEFORE UPDATE OF viewed_at ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_message_expiry();

-- Ajuste imediato para registros já visualizados sem expiração definida
UPDATE public.messages
SET expires_at = now() + interval '2 minutes',
    auto_delete_at = now() + interval '2 minutes'
WHERE viewed_at IS NOT NULL AND expires_at IS NULL;

-- 4) PG_CRON: deleção real (server-side) a cada minuto
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete_expired_messages') THEN
    PERFORM cron.schedule(
      'delete_expired_messages',
      '*/1 * * * *',
      $$DELETE FROM public.messages WHERE auto_delete_at IS NOT NULL AND auto_delete_at <= now();$$
    );
  END IF;
END $$;

-- 5) (Opcional) REPLICA IDENTITY FULL para DELETE old.* completo nos eventos realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
