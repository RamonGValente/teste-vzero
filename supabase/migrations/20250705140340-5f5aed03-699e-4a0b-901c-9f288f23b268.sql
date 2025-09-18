-- Create table for typing status
CREATE TABLE public.typing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing status
CREATE POLICY "Users can view typing status in their conversations" 
ON public.typing_status 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = contact_id);

CREATE POLICY "Users can update their own typing status" 
ON public.typing_status 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create table for custom notification sounds
CREATE TABLE public.user_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  message_sound_url TEXT,
  attention_sound_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification settings
CREATE POLICY "Users can manage their own notification settings" 
ON public.user_notification_settings 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for notification sounds
INSERT INTO storage.buckets (id, name, public) VALUES ('notification-sounds', 'notification-sounds', false);

-- Storage policies for notification sounds
CREATE POLICY "Users can view their own notification sounds" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'notification-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own notification sounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'notification-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own notification sounds" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'notification-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own notification sounds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'notification-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update typing status with auto-cleanup
CREATE OR REPLACE FUNCTION public.update_typing_status(contact_user_id UUID, typing BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Enable realtime for typing status
ALTER TABLE public.typing_status REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.typing_status;