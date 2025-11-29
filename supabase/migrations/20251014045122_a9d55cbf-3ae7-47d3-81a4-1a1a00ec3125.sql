-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;

-- Create a new policy for INSERT that allows all authenticated users
CREATE POLICY "Authenticated users can create conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (true);