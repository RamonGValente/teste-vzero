-- Temporarily check RLS status and recreate policies more explicitly
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;

-- Create a very permissive policy for INSERT
CREATE POLICY "Allow authenticated to insert conversations"
ON conversations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Also ensure RLS is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;