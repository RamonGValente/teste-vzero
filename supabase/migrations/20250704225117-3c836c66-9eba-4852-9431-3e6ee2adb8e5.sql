-- Create user_activity_logs table to track login/usage time
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user activity logs
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity logs" 
ON public.user_activity_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_session(session_minutes INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Insert or update current session
  INSERT INTO public.user_activity_logs (user_id, session_start, session_end, total_minutes)
  VALUES (
    auth.uid(),
    now() - INTERVAL '1 minute' * session_minutes,
    now(),
    session_minutes
  )
  ON CONFLICT (id) DO NOTHING;
END;
$function$;

-- Create index for better performance
CREATE INDEX idx_user_activity_logs_user_id_date ON public.user_activity_logs(user_id, created_at);
CREATE INDEX idx_user_activity_logs_recent ON public.user_activity_logs(created_at) WHERE created_at >= now() - INTERVAL '30 days';