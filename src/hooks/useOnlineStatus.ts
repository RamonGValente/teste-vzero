import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Mantém o usuário online com heartbeat e marca offline ao sair/ocultar.
 * Usa RPC set_presence(p_online) (security definer) e faz fallback para update direto.
 */
export function useOnlineStatus() {
  const hideTimer = useRef<number | null>(null);
  const heartbeat = useRef<number | null>(null);

  useEffect(() => {
    const setPresence = async (online: boolean) => {
      try {
        const { error } = await supabase.rpc('set_presence', { p_online: online });
        if (!error) return;
      } catch {}
      // fallback
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        await supabase
          .from('profiles')
          .update({ status: online ? 'online' : 'offline', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', uid);
      } catch {}
    };

    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        hideTimer.current = window.setTimeout(() => setPresence(false), 65_000) as unknown as number;
      } else {
        if (hideTimer.current) { clearTimeout(hideTimer.current!); hideTimer.current = null; }
        setPresence(true);
      }
    };

    setPresence(true);
    heartbeat.current = window.setInterval(() => setPresence(true), 20_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('beforeunload', () => { void setPresence(false); });

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (heartbeat.current) clearInterval(heartbeat.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setPresence(false);
    };
  }, []);
}
