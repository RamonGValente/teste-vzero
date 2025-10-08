
-- Video/Audio call tables and RLS policies
-- Safe to run multiple times (IF NOT EXISTS where supported)

-- video_calls
CREATE TABLE IF NOT EXISTS public.video_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES public.profiles(id),
  receiver_id uuid NOT NULL REFERENCES public.profiles(id),
  room_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'calling' CHECK (status IN ('calling','accepted','declined','ended','cancelled','missed')),
  call_type text NOT NULL DEFAULT 'video' CHECK (call_type IN ('video','audio')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- webrtc_tokens
CREATE TABLE IF NOT EXISTS public.webrtc_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- enable RLS
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webrtc_tokens ENABLE ROW LEVEL SECURITY;

-- Policies: participants can see their calls
DO $$ BEGIN
  CREATE POLICY video_calls_select_participants ON public.video_calls
    FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY video_calls_insert_caller ON public.video_calls
    FOR INSERT WITH CHECK (auth.uid() = caller_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY video_calls_update_participants ON public.video_calls
    FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tokens: only owner can insert/select
DO $$ BEGIN
  CREATE POLICY webrtc_tokens_insert_owner ON public.webrtc_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY webrtc_tokens_select_owner ON public.webrtc_tokens
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_calls_updated_at ON public.video_calls;
CREATE TRIGGER trg_video_calls_updated_at
  BEFORE UPDATE ON public.video_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- If status goes to ended/cancelled/declined, set ended_at
CREATE OR REPLACE FUNCTION public.set_call_end_time() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('ended','cancelled','declined','missed') AND NEW.ended_at IS NULL THEN
    NEW.ended_at = now();
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_calls_endtime ON public.video_calls;
CREATE TRIGGER trg_video_calls_endtime
  BEFORE UPDATE ON public.video_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_call_end_time();
