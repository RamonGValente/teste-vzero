import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import '@/styles/attention.css';

/** Listener global para INSERTs em public.attention_calls do usuário logado. */
export const RealtimeAttentionListener: React.FC = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundUrl, setSoundUrl] = useState<string | null>(null);
  const sessionStartRef = useRef<Date>(new Date());

  useEffect(() => {
    if (!user?.id) return;
    const loadSound = async () => {
      try {
        const { data } = await supabase
          .from('user_notification_settings')
          .select('attention_sound_url')
          .eq('user_id', user.id)
          .maybeSingle();
        const url = data?.attention_sound_url || '/sounds/attention.mp3';
        setSoundUrl(url);
        audioRef.current = new Audio(url);
        audioRef.current.preload = 'auto';
        audioRef.current.volume = 1.0;
      } catch {
        setSoundUrl(null);
        audioRef.current = null;
      }
    };
    loadSound();
  }, [user?.id]);

  const playBeepFallback = async () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 450);
    } catch {}
  };

  const playSound = async () => {
    try { if (audioRef.current) await audioRef.current.play(); else await playBeepFallback(); }
    catch { await playBeepFallback(); }
  };

  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel('attention_calls_global_listener')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attention_calls', filter: `receiver_id=eq.${user.id}` }, async (payload) => {
        const createdAt = new Date((payload.new as any)?.created_at ?? Date.now());
        if (createdAt < sessionStartRef.current) return;

        const senderId = (payload.new as any)?.sender_id as string;
        let senderName = 'Alguém';
        try {
          const { data } = await supabase.from('profiles').select('full_name').eq('id', senderId).maybeSingle();
          if (data?.full_name) senderName = data.full_name;
        } catch {}

        document.body.classList.add('shake-animation');
        setTimeout(() => document.body.classList.remove('shake-animation'), 700);

        toast.custom((t) => (
          <div className="attention-toast attention-shake" role="alert" onClick={() => toast.dismiss(t)}>
            <div className="attention-dot" />
            <div><strong>{senderName}</strong> está chamando sua atenção!</div>
          </div>
        ), { duration: 4000 });

        await playSound();
      })
      .subscribe();

    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [user?.id, soundUrl]);

  return null;
};
