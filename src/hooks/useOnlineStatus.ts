import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { HEARTBEAT_MS } from '@/lib/presence';

/**
 * Keeps current user presence accurate:
 * - sets online immediately
 * - sends heartbeat updating last_seen periodically
 * - marks away->offline after tab hidden for 60s
 * - best-effort mark offline on unload
 *
 * Requires Postgres RPC `set_presence(p_online boolean)` or fallback to direct update on profiles.
 */
export function useOnlineStatus() {
  const hideTimer = useRef<number | null>(null);
  const hb = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const setPresence = async (online: boolean) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !user) return;
        // try RPC first
        const rpc = await supabase.rpc('set_presence', { p_online: online });
        if (!rpc.error) return;

        // fallback update
        await supabase.from('profiles')
          .update({
            status: online ? 'online' : 'offline',
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch (_e) {
        // ignore
      }
    };

    const onVisible = () => {
      // if visible -> set online now and restore heartbeat
      void setPresence(true);
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    const onHidden = () => {
      // give a grace period; if still hidden, mark offline
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => { void setPresence(false); }, 60_000);
    };

    // Start
    void setPresence(true);
    hb.current = window.setInterval(() => { void setPresence(true); }, HEARTBEAT_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onVisible();
      else onHidden();
    });

    const onUnload = () => { void setPresence(false); };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      mounted = false;
      if (hb.current) window.clearInterval(hb.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      document.removeEventListener('visibilitychange', () => {});
      window.removeEventListener('beforeunload', onUnload);
      void setPresence(false);
    };
  }, []);
}
