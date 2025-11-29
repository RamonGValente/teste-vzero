-- Drop existing policies if they exist to recreate them correctly
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;

-- Create RLS policies for media bucket
CREATE POLICY "Users can upload their own media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media');