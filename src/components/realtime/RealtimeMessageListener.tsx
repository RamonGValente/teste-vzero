import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  created_at: string;
};

type ProfileLite = {
  username: string | null;
  avatar_url: string | null;
};

/**
 * Listener global para novas mensagens (foreground). 
 * - Toca som + vibração
 * - Mostra toast com avatar + preview
 * - Ao clicar, abre /messages?conversation=...
 *
 * Observação: Push cobre o background; este listener cobre o app aberto.
 */
export function RealtimeMessageListener() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversationIds, setConversationIds] = useState<Set<string>>(new Set());
  const profileCache = useRef<Map<string, ProfileLite>>(new Map());
  const seen = useRef<Set<string>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/alertasom.mp3");
    audioRef.current.preload = "auto";

    const unlock = async () => {
      try {
        // @ts-ignore - Safari uses webkitAudioContext
        audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }
        const buf = audioCtxRef.current.createBuffer(1, 1, 22050);
        const src = audioCtxRef.current.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtxRef.current.destination);
        src.start(0);
      } catch {
        // ignore
      }
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
      // @ts-ignore
      audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const duration = 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(784, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  };

  const playAlertSound = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return;
      }
    } catch {
      // ignore
    }
    await playBeepFallback();
  };

  const fetchProfile = async (userId: string): Promise<ProfileLite> => {
    const cached = profileCache.current.get(userId);
    if (cached) return cached;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();

    const p: ProfileLite = {
      username: data?.username ?? "Usuário",
      avatar_url: data?.avatar_url ?? null,
    };
    profileCache.current.set(userId, p);
    return p;
  };

  const notify = async (row: MessageRow) => {
    if (!user?.id) return;
    if (row.user_id === user.id) return;
    if (!conversationIds.has(row.conversation_id)) return;
    if (seen.current.has(row.id)) return;
    seen.current.add(row.id);

    const sender = await fetchProfile(row.user_id);
    await playAlertSound();
    if (navigator.vibrate) {
      try { navigator.vibrate(60); } catch {}
    }

    const preview = row.content?.trim()
      ? row.content.trim().slice(0, 90)
      : (row.media_urls?.length ? "📎 Mídia recebida" : "Nova mensagem");

    toast.custom(
      (t) => (
        <div
          className="flex items-center gap-3 px-3 py-2 cursor-pointer"
          onClick={() => {
            toast.dismiss(t);
            navigate(`/messages?conversation=${row.conversation_id}`);
          }}
        >
          <div className="h-9 w-9 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
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
              {sender.username ?? "Usuário"}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[280px]">
              {preview}
            </div>
          </div>
        </div>
      ),
      { duration: 4500 }
    );
  };

  // Carregar conversas do usuário
  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("Erro ao carregar conversas do usuário:", error);
        return;
      }
      if (!active) return;
      setConversationIds(new Set((data || []).map((r: any) => r.conversation_id)));
    };

    load();

    const ch = supabase
      .channel(`conv_participants_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  // Escutar novas mensagens
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`messages_foreground_${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => notify(payload.new as MessageRow)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, conversationIds]);

  return null;
}
