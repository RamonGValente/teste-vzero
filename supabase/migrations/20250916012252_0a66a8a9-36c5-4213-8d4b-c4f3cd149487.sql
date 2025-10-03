-- Add foreign keys to link tables to profiles (not auth.users directly)
-- This follows Supabase best practices for user references

-- First, add foreign keys that reference profiles table
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_contact_id_profiles_fkey 
FOREIGN KEY (contact_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.attention_calls 
ADD CONSTRAINT attention_calls_sender_id_profiles_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.attention_calls 
ADD CONSTRAINT attention_calls_receiver_id_profiles_fkey 
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.contact_invitations 
ADD CONSTRAINT contact_invitations_sender_id_profiles_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.contact_invitations 
ADD CONSTRAINT contact_invitations_receiver_id_profiles_fkey 
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.blocked_contacts 
ADD CONSTRAINT blocked_contacts_blocked_user_id_profiles_fkey 
FOREIGN KEY (blocked_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_profiles_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_receiver_id_profiles_fkey 
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;