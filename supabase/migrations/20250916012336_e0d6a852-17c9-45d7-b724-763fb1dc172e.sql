-- Clean up orphaned data before adding foreign keys
-- Remove contacts that reference non-existent profiles

DELETE FROM public.contacts 
WHERE contact_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.contacts 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.attention_calls 
WHERE sender_id NOT IN (SELECT id FROM public.profiles)
   OR receiver_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.contact_invitations 
WHERE sender_id NOT IN (SELECT id FROM public.profiles)
   OR receiver_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.blocked_contacts 
WHERE user_id NOT IN (SELECT id FROM public.profiles)
   OR blocked_user_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.messages 
WHERE sender_id NOT IN (SELECT id FROM public.profiles)
   OR receiver_id NOT IN (SELECT id FROM public.profiles);

-- Now add the foreign key constraints
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_contact_id_profiles_fkey 
FOREIGN KEY (contact_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

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
ADD CONSTRAINT blocked_contacts_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.blocked_contacts 
ADD CONSTRAINT blocked_contacts_blocked_user_id_profiles_fkey 
FOREIGN KEY (blocked_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_profiles_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_receiver_id_profiles_fkey 
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;