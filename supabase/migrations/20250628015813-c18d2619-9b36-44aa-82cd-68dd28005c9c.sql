
-- Criar tabela para convites de contato
CREATE TABLE public.contact_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- Criar tabela para contatos bloqueados
CREATE TABLE public.blocked_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- Criar tabela para ações de chamar atenção
CREATE TABLE public.attention_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.contact_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attention_calls ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contact_invitations
CREATE POLICY "Users can view invitations sent to them or by them" ON public.contact_invitations
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can create invitations" ON public.contact_invitations
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invitations sent to them" ON public.contact_invitations
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Políticas RLS para blocked_contacts
CREATE POLICY "Users can view their own blocked contacts" ON public.blocked_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blocked contacts" ON public.blocked_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocked contacts" ON public.blocked_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para attention_calls
CREATE POLICY "Users can view attention calls sent to them or by them" ON public.attention_calls
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can create attention calls" ON public.attention_calls
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Habilitar realtime para as novas tabelas
ALTER TABLE public.contact_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.blocked_contacts REPLICA IDENTITY FULL;
ALTER TABLE public.attention_calls REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attention_calls;
