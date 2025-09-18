-- Impede envio de atenção para usuários offline (lado servidor)
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
CREATE TRIGGER trg_prevent_attention_to_offline
BEFORE INSERT ON public.attention_calls
FOR EACH ROW EXECUTE FUNCTION public.prevent_attention_to_offline();
