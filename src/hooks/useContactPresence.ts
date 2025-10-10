import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isOnline } from '@/lib/presence';

/** Presença de UM contato (para header do chat) */
export function useContactPresence(contactId?: string) {
  const [status, setStatus] = useState<string>('offline');
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [contactOnline, setContactOnline] = useState<boolean>(false);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!contactId) return;
    let unsub: (() => void) | undefined;

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('status,last_seen')
        .eq('id', contactId)
        .maybeSingle();
      if (!mounted.current) return;
      const s = data?.status ?? 'offline';
      setStatus(s);
      setLastSeen(data?.last_seen ?? null);
      setContactOnline(isOnline(s, data?.last_seen ?? null));
    };

    const subscribe = () => {
      const ch = supabase
        .channel('presence:contact')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${contactId}` }, (payload) => {
          const next: any = payload.new;
          if (!mounted.current || !next) return;
          const s = next.status ?? 'offline';
          setStatus(s);
          setLastSeen(next.last_seen ?? null);
          setContactOnline(isOnline(s, next.last_seen ?? null));
        })
        .subscribe();
      return () => { try { supabase.removeChannel(ch); } catch {} };
    };

    load();
    unsub = subscribe();
    return () => { try { unsub?.(); } catch {} };
  }, [contactId]);

  return { contactOnline, status, lastSeen };
}
