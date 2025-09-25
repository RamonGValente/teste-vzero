-- ========================================
-- COMPLETE PROJECT RECREATION FROM SCRATCH
-- ========================================

-- Drop all existing tables and functions first
DROP TABLE IF EXISTS attention_call_limits CASCADE;
DROP TABLE IF EXISTS attention_calls CASCADE;
DROP TABLE IF EXISTS attention_silence_settings CASCADE;
DROP TABLE IF EXISTS blocked_contacts CASCADE;
DROP TABLE IF EXISTS contact_invitations CASCADE;
DROP TABLE IF EXISTS deleted_messages CASCADE;
DROP TABLE IF EXISTS message_files CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS typing_status CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS user_notification_settings CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS get_contacts_ranking CASCADE;
DROP FUNCTION IF EXISTS update_typing_status CASCADE;
DROP FUNCTION IF EXISTS update_user_status CASCADE;
DROP FUNCTION IF EXISTS delete_old_attention_calls CASCADE;

-- ========================================
-- 1. BASE UTILITY FUNCTIONS (with proper security)
-- ========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ========================================
-- 2. PROFILES TABLE - Core user data
-- ========================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT 'Usuário',
    email TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
    user_code TEXT UNIQUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, user_code, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
        NEW.email,
        substring(NEW.id::text from 1 for 8),
        'online'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 3. CONTACTS TABLE - User relationships
-- ========================================

CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "contacts_select_policy" ON public.contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contacts_insert_policy" ON public.contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_delete_policy" ON public.contacts
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 4. MESSAGES TABLE - Core messaging
-- ========================================

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
    file_url TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    single_view BOOLEAN DEFAULT false,
    viewed_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_delete_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- RLS Policies
CREATE POLICY "messages_select_policy" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_policy" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_policy" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_delete_policy" ON public.messages
    FOR DELETE USING (auth.uid() = sender_id);

-- Trigger for updated_at
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 5. CONTACT INVITATIONS TABLE
-- ========================================

CREATE TABLE public.contact_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.contact_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "invitations_select_policy" ON public.contact_invitations
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "invitations_insert_policy" ON public.contact_invitations
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "invitations_update_policy" ON public.contact_invitations
    FOR UPDATE USING (auth.uid() = receiver_id);

-- Trigger for updated_at
CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON public.contact_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 6. BLOCKED CONTACTS TABLE
-- ========================================

CREATE TABLE public.blocked_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, blocked_user_id)
);

-- Enable RLS
ALTER TABLE public.blocked_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "blocked_contacts_policy" ON public.blocked_contacts
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 7. TYPING STATUS TABLE
-- ========================================

CREATE TABLE public.typing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "typing_status_policy" ON public.typing_status
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = contact_id)
    WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 8. ATTENTION CALLS TABLE
-- ========================================

CREATE TABLE public.attention_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attention_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "attention_calls_policy" ON public.attention_calls
    FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = sender_id);

-- ========================================
-- 9. USER NOTIFICATION SETTINGS TABLE
-- ========================================

CREATE TABLE public.user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    message_sound_url TEXT,
    attention_sound_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "notification_settings_policy" ON public.user_notification_settings
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 10. UTILITY FUNCTIONS (with proper security)
-- ========================================

-- Function to get contacts ranking
CREATE OR REPLACE FUNCTION public.get_contacts_ranking()
RETURNS TABLE(user_id UUID, full_name TEXT, avatar_url TEXT, contact_count BIGINT, status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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

-- Function to update typing status
CREATE OR REPLACE FUNCTION public.update_typing_status(contact_user_id UUID, typing BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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

-- Function to update user status
CREATE OR REPLACE FUNCTION public.update_user_status(new_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        status = new_status,
        last_seen = NOW(),
        updated_at = NOW()
    WHERE id = auth.uid();
END;
$$;

-- Function to clean old attention calls
CREATE OR REPLACE FUNCTION public.delete_old_attention_calls()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM public.attention_calls
    WHERE created_at < NOW() - INTERVAL '1 minute';
END;
$$;

-- ========================================
-- 11. STORAGE SETUP
-- ========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('message-files', 'message-files', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for message files
CREATE POLICY "Message files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-files');

CREATE POLICY "Users can upload message files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- 12. INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_contact_id ON public.contacts(contact_id);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_typing_status_updated_at ON public.typing_status(updated_at);
CREATE INDEX idx_profiles_user_code ON public.profiles(user_code);
CREATE INDEX idx_profiles_status ON public.profiles(status);