-- Add private community fields
ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS password_hash text;