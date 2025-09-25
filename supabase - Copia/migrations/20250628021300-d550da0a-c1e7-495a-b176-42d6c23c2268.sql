
-- Criar tabela para armazenar arquivos de mídia das mensagens
CREATE TABLE public.message_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para arquivos de mensagens
ALTER TABLE public.message_files ENABLE ROW LEVEL SECURITY;

-- Política para visualizar arquivos de mensagens próprias
CREATE POLICY "Users can view message files from their conversations" 
  ON public.message_files 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_files.message_id 
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

-- Política para inserir arquivos de mensagens próprias
CREATE POLICY "Users can insert message files for their messages" 
  ON public.message_files 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_files.message_id 
      AND m.sender_id = auth.uid()
    )
  );

-- Criar bucket para avatars de perfil
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Criar bucket para arquivos de mensagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-files', 'message-files', true);

-- Políticas para o bucket de avatars
CREATE POLICY "Avatar images are publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para o bucket de arquivos de mensagens
CREATE POLICY "Message files are accessible to conversation participants" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'message-files' AND 
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.file_url LIKE '%' || name || '%'
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload message files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'message-files');

-- Adicionar RLS às policies de attention_calls
ALTER TABLE public.attention_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attention calls sent to them" 
  ON public.attention_calls 
  FOR SELECT 
  USING (receiver_id = auth.uid());

CREATE POLICY "Users can send attention calls" 
  ON public.attention_calls 
  FOR INSERT 
  WITH CHECK (sender_id = auth.uid());
