import React, { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import '@/styles/attention.css';

const ATTENTION_INTERVAL_MS = 3000; // fallback de polling 3s

export const RealtimeAttentionListener: React.FC = () => {
  const { user } = useAuth();
  const seenIds = useRef<Set<string>>(new Set());
  const mountedAt = useRef<number>(Date.now());
  const pollTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload do som (ou fallback)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('user_notification_settings')
          .select('attention_sound_url')
          .eq('user_id', user.id)
          .maybeSingle();
        const url = data?.attention_sound_url || '/sounds/attention.wav';
        const a = new Audio(url);
        a.preload = 'auto';
        a.volume = 1;
        audioRef.current = a;
      } catch {
        audioRef.current = new Audio('/sounds/attention.wav');
      }
    })();
  }, [user?.id]);

  const present = async (row: { id: string; sender_id: string; message?: string | null; created_at?: string }) => {
    if (!user?.id) return;
    if (seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);

    // Checa se está silenciado para esse remetente
    const { data: sil } = await supabase
      .from('attention_silence_settings')
      .select('silenced_until')
      .eq('user_id', user.id)
      .eq('sender_id', row.sender_id)
      .maybeSingle();
    if (sil?.silenced_until && new Date(sil.silenced_until) > new Date()) return;

    // Nome do remetente (prefere 'message')
    let name = row.message ?? '';
    if (!name) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', row.sender_id)
        .maybeSingle();
      name = prof?.full_name || 'Contato';
    }

    // Shake global
    document.body.classList.add('shake-animation');
    setTimeout(() => document.body.classList.remove('shake-animation'), 700);

    // Toast no topo
    toast.custom(
      (t) => (
        <div className="attention-toast attention-shake" onClick={() => toast.dismiss(t)} role="alert">
          <div className="attention-dot" />
          <div><strong>{name}</strong> está chamando sua atenção!</div>
        </div>
      ),
      { duration: 5000, position: 'top-center' }
    );

    try { await audioRef.current?.play(); } catch {}

    // marca como visto apenas se veio do banco (não-broadcast)
    if (!row.id.startsWith('brdcst:')) {
      await supabase
        .from('attention_calls')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('receiver_id', user.id);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // 1) Realtime Postgres Changes
    const chDB = supabase
      .channel('attention_calls_global_v6')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attention_calls', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          // evita eventos anteriores à sessão
          if (new Date(row.created_at).getTime() + 500 < mountedAt.current) return;
          void present(row);
        }
      )
      .subscribe();

    // 2) Canal Broadcast instantâneo (independe do Realtime do Postgres)
    const chBC = supabase
      .channel(`attention_user_${user.id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'attention' }, (payload) => {
        const p: any = payload.payload || {};
        const id = `brdcst:${p.sender_id}:${p.created_at || Date.now()}`;
        void present({ id, sender_id: p.sender_id, message: p.message, created_at: p.created_at });
      })
      .subscribe();

    // 3) polling fallback (caso não tenha publication/policies)
    const poll = async () => {
      const since = new Date(mountedAt.current - 60_000).toISOString();
      const { data } = await supabase
        .from('attention_calls')
        .select('id,sender_id,message,created_at,viewed_at')
        .eq('receiver_id', user.id)
        .is('viewed_at', null)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(25);
      for (const r of data || []) await present(r as any);
    };
    pollTimer.current = window.setInterval(poll, ATTENTION_INTERVAL_MS);

    return () => {
      try { supabase.removeChannel(chDB); } catch {}
      try { supabase.removeChannel(chBC); } catch {}
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      pollTimer.current = null;
      seenIds.current.clear();
    };
  }, [user?.id]);

  return null;
};
