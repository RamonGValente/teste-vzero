import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Presença para uma LISTA de contatos (menu lateral) */
export function usePresenceForContacts(contactIds: string[] | undefined) {
  const [map, setMap] = useState<Record<string, { status: string; last_seen: string | null }>>({});
  const idsKey = useMemo(() => (contactIds || []).join(','), [contactIds]);
  const setIds = useMemo(() => new Set(contactIds || []), [idsKey]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!contactIds || contactIds.length === 0) { setMap({}); return; }
    let unsub: (() => void) | undefined;

    const load = async () => {
      const { data } = await supabase.from('profiles').select('id,status,last_seen').in('id', contactIds);
      if (!mounted.current) return;
      const next: Record<string, { status: string; last_seen: string | null }> = {};
      (data || []).forEach((row: any) => next[row.id] = { status: row.status ?? 'offline', last_seen: row.last_seen ?? null });
      setMap(next);
    };

    const subscribe = () => {
      const ch = supabase
        .channel('presence:list')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
          const row: any = payload.new;
          const id = row?.id;
          if (!id || !setIds.has(id) || !mounted.current) return;
          setMap(prev => ({ ...prev, [id]: { status: row.status ?? 'offline', last_seen: row.last_seen ?? null } }));
        })
        .subscribe();
      return () => { try { supabase.removeChannel(ch); } catch {} };
    };

    load();
    unsub = subscribe();
    return () => { try { unsub?.(); } catch {} };
  }, [idsKey]);

  return map;
}
