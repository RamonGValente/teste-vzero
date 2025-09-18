import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useAudioUnlock } from '@/hooks/useAudioUnlock';

type NotificationType = 'message' | 'attention';
type Ctx = {
  showNotification: (title: string, body: string, avatar?: string, type?: NotificationType) => void;
};

const NotificationCtx = createContext<Ctx>({ showNotification: () => {} });
export const useNotifications = () => useContext(NotificationCtx);

export const NotificationProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  const unlocked = useAudioUnlock(() => {
    setEnabled(true);
    try {
      audioRef.current?.play().then(() => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
      }).catch(() => {});
    } catch {}
  });

  useEffect(() => {
    const el = new Audio('/sounds/attention.mp3');
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.volume = 1.0;
    el.onerror = () => {
      try {
        const wav = new Audio('/sounds/attention.wav');
        wav.preload = 'auto';
        wav.volume = 1.0;
        audioRef.current = wav;
      } catch {}
    };
    audioRef.current = el;
    return () => { try { el.pause(); } catch {} };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }
  }, []);

  const showNotification = useCallback((title: string, body: string, avatar?: string, type: NotificationType = 'message') => {
    const isAttention = type === 'attention';
    toast.custom(() => (
      <div className={\`rounded-md bg-white dark:bg-neutral-900 shadow-md px-4 py-3 flex items-start gap-3 \${isAttention ? 'animate-[shake_0.5s_ease-in-out_2]' : ''}\`}>
        <div className="shrink-0 h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          {avatar ? <img src={avatar} className="h-8 w-8 object-cover" /> : <div className="h-8 w-8 flex items-center justify-center text-neutral-500">✓</div>}
        </div>
        <div className="text-sm">
          <div className="font-medium">{title}</div>
          <div className="text-neutral-600 dark:text-neutral-300">{body}</div>
        </div>
      </div>
    ), { duration: isAttention ? 6000 : 4000 });

    if (isAttention && audioRef.current && (enabled || unlocked)) {
      audioRef.current.play().catch(() => {});
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: avatar }); } catch {}
    }
  }, [enabled, unlocked]);

  return (
    <NotificationCtx.Provider value={{ showNotification }}>
      {children}
      <Toaster position="top-right" richColors theme="system" />
      <style>{\`@keyframes shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(2px,0,0)}30%,50%,70%{transform:translate3d(-4px,0,0)}40%,60%{transform:translate3d(4px,0,0)}}\`}</style>
    </NotificationCtx.Provider>
  );
};
