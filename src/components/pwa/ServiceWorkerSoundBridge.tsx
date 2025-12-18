import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Recebe mensagens do Service Worker para:
 * - tocar som quando o push chega e o app está aberto
 * - navegar quando o usuário clica na notificação
 *
 * Observação: navegadores não permitem tocar som quando o app está fechado.
 */
export function ServiceWorkerSoundBridge() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    audioRef.current = new Audio("/sounds/push.mp3");
    audioRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;

      if (data?.type === "PLAY_NOTIFICATION_SOUND") {
        const soundUrl = typeof data.soundUrl === "string" ? data.soundUrl : "/sounds/push.mp3";
        if (!audioRef.current) audioRef.current = new Audio(soundUrl);
        audioRef.current.src = soundUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      if (data?.type === "NAVIGATE" && typeof data.url === "string") {
        navigate(data.url);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

  return null;
}
