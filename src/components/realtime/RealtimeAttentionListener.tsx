import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/attention.css";
import { runAttentionVibration, runShakeEffect, shouldRunAttentionEffect } from "@/lib/attentionEffects";

type AttentionCall = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  created_at: string;
};

type ProfileLite = {
  username: string | null;
  avatar_url: string | null;
};

export function RealtimeAttentionListener() {
  const { user } = useAuth();
  const seen = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const profileCache = useRef<Map<string, ProfileLite>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  // Robust unlock for audio on first user gesture
  useEffect(() => {
    audioRef.current = new Audio("/sounds/alertasom.mp3");
    audioRef.current.preload = "auto";

    const unlock = async () => {
      try {
        if (!audioCtxRef.current) {
          // @ts-ignore - Safari uses webkitAudioContext
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }
        // do a tiny silent play to satisfy autoplay policies
        const buf = audioCtxRef.current.createBuffer(1, 1, 22050);
        const src = audioCtxRef.current.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtxRef.current.destination);
        src.start(0);
        unlockedRef.current = true;
      } catch {}
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const playBeepFallback = async () => {
    try {
      if (!audioCtxRef.current) {
        // @ts-ignore
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      const duration = 0.25; // 250ms
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // no-op
    }
  };

  const playAlertSound = async () => {
    // Try element sound first
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return;
      }
    } catch {}
    // Fallback beep (Web Audio)
    await playBeepFallback();
  };

  const fetchSenderProfile = async (senderId: string): Promise<ProfileLite> => {
    const cached = profileCache.current.get(senderId);
    if (cached) return cached;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", senderId)
      .single();

    const profile: ProfileLite = {
      username: data?.username ?? "Usuário",
      avatar_url: data?.avatar_url ?? null,
    };

    profileCache.current.set(senderId, profile);
    return profile;
  };

  const notify = async (row: AttentionCall) => {
    if (seen.current.has(row.id)) return;
    seen.current.add(row.id);

    const sender = await fetchSenderProfile(row.sender_id);

    const runEffect = shouldRunAttentionEffect();

    // Sound + vibration + shake (com dedupe entre Realtime e Push)
    if (runEffect) {
      await playAlertSound();
      runAttentionVibration();
      runShakeEffect(600);
    }

    // toast with avatar + name
    toast.custom(
      () => (
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {sender.avatar_url ? (
              <img
                src={sender.avatar_url}
                alt={sender.username ?? "Avatar"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold">
                {(sender.username ?? "U").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold leading-5">
              {sender.username ?? "Usuário"} chamou sua atenção!
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[280px]">
              {row.message ?? "Você recebeu um alerta"}
            </div>
          </div>
        </div>
      ),
      { duration: 4000 }
    );
  };

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("attention_calls_for_me")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attention_calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as AttentionCall;
          await notify(row);
        }
      )
      .subscribe();

    let active = true;
    const runPolling = async () => {
      while (active) {
        try {
          const { data } = await supabase
            .from("attention_calls")
            .select("id, sender_id, receiver_id, message, created_at")
            .eq("receiver_id", user.id)
            .gte("created_at", new Date(Date.now() - 1000 * 60 * 10).toISOString())
            .order("created_at", { ascending: false })
            .limit(20);
          data?.forEach((row) => notify(row as AttentionCall));
        } catch {}
        await new Promise((r) => setTimeout(r, 3000));
      }
    };
    runPolling();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
}
