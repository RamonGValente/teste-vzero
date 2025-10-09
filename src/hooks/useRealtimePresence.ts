import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

type PresencePayload = { user_id: string; full_name?: string };

export function useRealtimePresence() {
  const { user, profile } = useAuth() as any;
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeat = useRef<any>(null);

  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase.channel('presence:global', {
      config: { presence: { key: user.id } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<PresencePayload>();
      const next = new Set<string>();
      Object.keys(state).forEach((k) => next.add(k));
      setOnlineSet(next);
    });

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        const track = () =>
          ch.track({
            user_id: user.id,
            full_name: profile?.full_name || undefined,
          } as PresencePayload);
        track();
        // Reenvia presença a cada 25s para evitar timeouts do servidor (mantém socket vivo)
        heartbeat.current = setInterval(track, 25_000);
      }
    });

    channelRef.current = ch;

    return () => {
      if (heartbeat.current) clearInterval(heartbeat.current);
      try { supabase.removeChannel(ch); } catch {}
      setOnlineSet(new Set());
    };
  }, [user?.id, profile?.full_name]);

  const isOnline = useMemo(
    () => (id?: string | null) => !!(id && onlineSet.has(id)),
    [onlineSet]
  );

  return { isOnline, onlineSet };
}
