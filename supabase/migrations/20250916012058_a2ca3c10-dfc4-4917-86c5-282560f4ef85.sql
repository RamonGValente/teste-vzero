-- Add foreign keys for proper relationships between tables

-- Add foreign keys for contacts table
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for attention_calls table
ALTER TABLE public.attention_calls 
ADD CONSTRAINT attention_calls_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.attention_calls 
ADD CONSTRAINT attention_calls_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for contact_invitations table  
ALTER TABLE public.contact_invitations 
ADD CONSTRAINT contact_invitations_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.contact_invitations 
ADD CONSTRAINT contact_invitations_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for blocked_contacts table
ALTER TABLE public.blocked_contacts 
ADD CONSTRAINT blocked_contacts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.blocked_contacts 
ADD CONSTRAINT blocked_contacts_blocked_user_id_fkey 
FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for messages table
ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for all settings tables
ALTER TABLE public.privacy_settings 
ADD CONSTRAINT privacy_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notification_settings 
ADD CONSTRAINT notification_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.storage_settings 
ADD CONSTRAINT storage_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_settings 
ADD CONSTRAINT chat_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.call_settings 
ADD CONSTRAINT call_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.general_settings 
ADD CONSTRAINT general_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.appearance_settings 
ADD CONSTRAINT appearance_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_activity_logs 
ADD CONSTRAINT user_activity_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.typing_status 
ADD CONSTRAINT typing_status_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.typing_status 
ADD CONSTRAINT typing_status_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.attention_silence_settings 
ADD CONSTRAINT attention_silence_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.attention_silence_settings 
ADD CONSTRAINT attention_silence_settings_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_notification_settings 
ADD CONSTRAINT user_notification_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.attention_call_limits 
ADD CONSTRAINT attention_call_limits_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.deleted_messages 
ADD CONSTRAINT deleted_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.deleted_messages 
ADD CONSTRAINT deleted_messages_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;