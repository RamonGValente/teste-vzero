
-- Adicionar coluna user_code na tabela profiles para permitir adicionar contatos por código
ALTER TABLE public.profiles 
ADD COLUMN user_code TEXT UNIQUE;

-- Criar índice para melhor performance na busca por código
CREATE UNIQUE INDEX idx_profiles_user_code ON public.profiles(user_code) WHERE user_code IS NOT NULL;

-- Criar tabela para controlar limitação de chamadas de atenção (5 minutos entre chamadas)
CREATE TABLE public.attention_call_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  last_call_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela attention_call_limits
ALTER TABLE public.attention_call_limits ENABLE ROW LEVEL SECURITY;

-- Política para usuários gerenciarem seus próprios limites
CREATE POLICY "Users can manage their own call limits" 
  ON public.attention_call_limits 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Criar tabela para silenciar notificações de chamadas de atenção
CREATE TABLE public.attention_silence_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  sender_id UUID REFERENCES auth.users NOT NULL,
  silenced_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sender_id)
);

-- Habilitar RLS na tabela attention_silence_settings
ALTER TABLE public.attention_silence_settings ENABLE ROW LEVEL SECURITY;

-- Política para usuários gerenciarem suas próprias configurações de silenciar
CREATE POLICY "Users can manage their own silence settings" 
  ON public.attention_silence_settings 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Adicionar colunas na tabela messages para status de entrega
ALTER TABLE public.messages 
ADD COLUMN viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN single_view BOOLEAN DEFAULT false,
ADD COLUMN auto_delete_at TIMESTAMP WITH TIME ZONE;
