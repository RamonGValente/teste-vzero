
-- Seeds: create two dummy profiles and a sample call (adjust UUIDs as needed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, status)
    VALUES ('00000000-0000-0000-0000-000000000001', 'alice', 'Alice Demo', null, 'online');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, status)
    VALUES ('00000000-0000-0000-0000-000000000002', 'bob', 'Bob Demo', null, 'online');
  END IF;
END $$;

-- Example call row (room_id must be unique)
INSERT INTO public.video_calls (caller_id, receiver_id, room_id, status, call_type)
VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','room_seed_example','calling','video')
ON CONFLICT DO NOTHING;
