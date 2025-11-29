-- Add language preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'pt';

-- Add fields to conversations for private rooms
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_temporary boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 2;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS auto_translate boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;