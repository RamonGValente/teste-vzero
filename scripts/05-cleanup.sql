
-- Cleanup: remove old tokens (expired > 1 day) and calls older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_webrtc_artifacts() RETURNS void AS $$
BEGIN
  DELETE FROM public.webrtc_tokens WHERE expires_at < now() - interval '1 day';
  DELETE FROM public.video_calls WHERE created_at < now() - interval '30 days' AND status IN ('ended','cancelled','declined','missed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduler via pg_cron (if available) or use Supabase Scheduler
-- If pg_cron is enabled:
-- SELECT cron.schedule('cleanup_webrtc_artifacts_daily', '0 3 * * *', $$SELECT public.cleanup_webrtc_artifacts();$$);
