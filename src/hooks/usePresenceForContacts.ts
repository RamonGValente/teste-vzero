// Live presence map for a set of profile IDs.
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { HEARTBEAT_MS } from '@/lib/presence';

type PresenceRow = { id: string; status: string | null; last_seen: string | null };

export function usePresenceForContacts(contactIdsRaw: string[]) {
  const contactIds = useMemo(() => (contactIdsRaw || []).map(String), [JSON.stringify(contactIdsRaw || [])]);
  const idsKey = useMemo(() => contactIds.slice().sort().join(','), [contactIds]);
  const [map, setMap] = useState<Record<string, PresenceRow>>({});
  const pollTimer = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // helpers
    const applyRows = (rows: PresenceRow[]) => {
      setMap(prev => {
        const next = { ...prev };
        for (const r of rows) {
          next[r.id] = { id: r.id, status: r.status, last_seen: r.last_seen };
        }
        return next;
      });
    };

    const load = async () => {
      if (contactIds.length === 0) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id,status,last_seen')
        .in('id', contactIds);
      if (!error && data) applyRows(data as PresenceRow[]);
    };

    const subscribe = () => {
      if (channelRef.current) { try { channelRef.current.unsubscribe(); } catch {} }
      if (contactIds.length === 0) return null;

      const filter = `id=in.(${contactIds.map(id => id).join(',')})`;
      const ch = supabase.channel('presence-contacts-' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter }, (payload: any) => {
          const row = (payload.new || payload.old);
          if (!row || !contactIds.includes(row.id)) return;
          applyRows([{ id: row.id, status: row.status ?? null, last_seen: row.last_seen ?? null }]);
        })
        .subscribe((status) => {
          // noop
        });

      channelRef.current = ch;
      return ch;
    };

    // start
    void load();
    const ch = subscribe();
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(load, HEARTBEAT_MS);

    return () => {
      if (pollTimer.current) { window.clearInterval(pollTimer.current); pollTimer.current = null; }
      if (ch) ch.unsubscribe();
    };
  }, [idsKey]);

  return map;
}
