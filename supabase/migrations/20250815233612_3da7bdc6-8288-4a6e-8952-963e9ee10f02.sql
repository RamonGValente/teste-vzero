-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Message files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message files" ON storage.objects;

-- Recreate storage policies with unique names
CREATE POLICY "avatar_select_policy" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatar_insert_policy" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatar_update_policy" ON storage.objects 
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "message_files_select_policy" ON storage.objects 
FOR SELECT USING (bucket_id = 'message-files');

CREATE POLICY "message_files_insert_policy" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'message-files' AND auth.uid()::text = (storage.foldername(name))[1]);