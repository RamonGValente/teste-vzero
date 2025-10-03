-- Drop all existing tables and functions
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.blocked_contacts CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.user_activity_logs CASCADE;
DROP TABLE IF EXISTS public.attention_silence_settings CASCADE;
DROP TABLE IF EXISTS public.typing_status CASCADE;
DROP TABLE IF EXISTS public.contact_invitations CASCADE;
DROP TABLE IF EXISTS public.deleted_messages CASCADE;
DROP TABLE IF EXISTS public.user_notification_settings CASCADE;
DROP TABLE IF EXISTS public.contato_convite CASCADE;
DROP TABLE IF EXISTS public.attention_calls CASCADE;
DROP TABLE IF EXISTS public.message_files CASCADE;
DROP TABLE IF EXISTS public.attention_call_limits CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_contacts_ranking() CASCADE;
DROP FUNCTION IF EXISTS public.contacts_ranking_top10() CASCADE;
DROP FUNCTION IF EXISTS public.delete_old_attention_calls() CASCADE;
DROP FUNCTION IF EXISTS public.update_typing_status(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_status(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_contacts_with_unread_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_user_session(integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'offline',
    user_code TEXT UNIQUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Read all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create contacts table
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, contact_id)
);

-- Enable RLS on contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create contacts policies
CREATE POLICY "Read own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- Create blocked_contacts table
CREATE TABLE public.blocked_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    blocked_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, blocked_user_id)
);

-- Enable RLS on blocked_contacts
ALTER TABLE public.blocked_contacts ENABLE ROW LEVEL SECURITY;

-- Create blocked_contacts policies
CREATE POLICY "Users can view their own blocked contacts" ON public.blocked_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own blocked contacts" ON public.blocked_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own blocked contacts" ON public.blocked_contacts FOR DELETE USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE public.messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    file_url TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    single_view BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_delete_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create messages policies
CREATE POLICY "Read own messages" ON public.messages FOR SELECT USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));
CREATE POLICY "Insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Delete own messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- Create message_files table
CREATE TABLE public.message_files (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on message_files
ALTER TABLE public.message_files ENABLE ROW LEVEL SECURITY;

-- Create message_files policies
CREATE POLICY "Users can view message files from their conversations" ON public.message_files FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.id = message_files.message_id 
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
));

CREATE POLICY "Users can insert message files for their messages" ON public.message_files FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.id = message_files.message_id 
    AND m.sender_id = auth.uid()
));

-- Create deleted_messages table
CREATE TABLE public.deleted_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on deleted_messages
ALTER TABLE public.deleted_messages ENABLE ROW LEVEL SECURITY;

-- Create deleted_messages policies
CREATE POLICY "Read own deletions" ON public.deleted_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own deletions" ON public.deleted_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create contact_invitations table
CREATE TABLE public.contact_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on contact_invitations
ALTER TABLE public.contact_invitations ENABLE ROW LEVEL SECURITY;

-- Create contact_invitations policies
CREATE POLICY "Users can view invitations sent to them or by them" ON public.contact_invitations FOR SELECT 
USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));
CREATE POLICY "Users can create invitations" ON public.contact_invitations FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update invitations sent to them" ON public.contact_invitations FOR UPDATE 
USING (auth.uid() = receiver_id);

-- Create typing_status table
CREATE TABLE public.typing_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    is_typing BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, contact_id)
);

-- Enable RLS on typing_status
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Create typing_status policies
CREATE POLICY "Users can update their own typing status" ON public.typing_status FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view typing status in their conversations" ON public.typing_status FOR SELECT 
USING ((auth.uid() = user_id) OR (auth.uid() = contact_id));

-- Create attention_calls table
CREATE TABLE public.attention_calls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    message TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on attention_calls
ALTER TABLE public.attention_calls ENABLE ROW LEVEL SECURITY;

-- Create attention_calls policies
CREATE POLICY "Users can view attention calls sent to them or by them" ON public.attention_calls FOR SELECT 
USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));
CREATE POLICY "Users can create attention calls" ON public.attention_calls FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create attention_call_limits table
CREATE TABLE public.attention_call_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    last_call_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on attention_call_limits
ALTER TABLE public.attention_call_limits ENABLE ROW LEVEL SECURITY;

-- Create attention_call_limits policies
CREATE POLICY "Users can manage their own call limits" ON public.attention_call_limits FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create attention_silence_settings table
CREATE TABLE public.attention_silence_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    silenced_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on attention_silence_settings
ALTER TABLE public.attention_silence_settings ENABLE ROW LEVEL SECURITY;

-- Create attention_silence_settings policies
CREATE POLICY "Users can manage their own silence settings" ON public.attention_silence_settings FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create user_notification_settings table
CREATE TABLE public.user_notification_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    message_sound_url TEXT,
    attention_sound_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_notification_settings
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create user_notification_settings policies
CREATE POLICY "Users can manage their own notification settings" ON public.user_notification_settings FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create user_activity_logs table
CREATE TABLE public.user_activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    session_end TIMESTAMP WITH TIME ZONE,
    total_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create user_activity_logs policies
CREATE POLICY "Users can view their own activity logs" ON public.user_activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own activity logs" ON public.user_activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activity logs" ON public.user_activity_logs FOR UPDATE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contact_invitations_updated_at BEFORE UPDATE ON public.contact_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create database functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
    NEW.email,
    'online'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_contacts_ranking()
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, contact_count bigint, status text)
LANGUAGE sql STABLE AS $$
  SELECT 
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    COUNT(c.id) AS contact_count,
    p.status
  FROM profiles p
  LEFT JOIN contacts c ON c.user_id = p.id
  GROUP BY p.id, p.full_name, p.avatar_url, p.status
  ORDER BY COUNT(c.id) DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.update_typing_status(contact_user_id uuid, typing boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.typing_status (user_id, contact_id, is_typing, updated_at)
  VALUES (auth.uid(), contact_user_id, typing, now())
  ON CONFLICT (user_id, contact_id)
  DO UPDATE SET 
    is_typing = typing,
    updated_at = now();
    
  -- Clean up old typing status (older than 10 seconds)
  DELETE FROM public.typing_status 
  WHERE updated_at < now() - INTERVAL '10 seconds';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_status(new_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    status = new_status,
    last_seen = NOW(),
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_old_attention_calls()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.attention_calls
    WHERE created_at < NOW() - INTERVAL '1 minute';
END;
$$;

-- Create auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();