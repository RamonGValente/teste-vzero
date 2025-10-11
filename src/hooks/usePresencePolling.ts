// src/hooks/usePresencePolling.ts (opcional)
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HEARTBEAT_MS } from '@/lib/presence';

type PresenceRow = { id: string; status: string | null; last_seen: string | null };

export function usePresencePolling(contactIds: string[]) {
  const [data, setData] = useState<Record<string, PresenceRow>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function tick() {
      if (!contactIds || contactIds.length === 0) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id,status,last_seen')
        .in('id', contactIds);
      if (error) return;
      if (!mounted) return;
      const map: Record<string, PresenceRow> = {};
      (data ?? []).forEach((r: any) => { map[r.id] = r; });
      setData(map);
    }

    tick();
    timer.current = setInterval(tick, HEARTBEAT_MS);
    return () => {
      mounted = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [JSON.stringify(contactIds || [])]);

  return data;
}
