-- Criar tabela para rastrear última visualização de cada seção
CREATE TABLE IF NOT EXISTS public.last_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section text NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, section)
);

-- Enable RLS
ALTER TABLE public.last_viewed ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own last_viewed records"
ON public.last_viewed FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own last_viewed records"
ON public.last_viewed FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own last_viewed records"
ON public.last_viewed FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);