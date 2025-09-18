import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useNotificationSounds } from '@/hooks/useNotificationSounds';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NotificationContextType {
  playSound: (soundType: 'message' | 'attention') => void;
  requestPermission: () => Promise<void>;
  showNotification: (title: string, body: string, avatar?: string, soundType?: 'message' | 'attention') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { playSound: playFromSettings } = useNotificationSounds();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
    } catch {}
  }, []);

  const playSound = useCallback((soundType: 'message' | 'attention') => {
    try {
      playFromSettings(soundType);
    } catch (e) {
      console.warn('Sound play failed', e);
    }
  }, [playFromSettings]);

  const showNotification = useCallback((title: string, body: string, avatar?: string, soundType: 'message' | 'attention' = 'message') => {
    // toast in-app (shake e som apenas na notificação)
    toast.custom(() => (
      <div className={soundType === 'attention' ? 'attention-toast-shake' : undefined}>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {avatar ? <AvatarImage src={avatar} alt="" /> : <AvatarFallback>{title.slice(0,2).toUpperCase()}</AvatarFallback>}
          </Avatar>
          <div className="flex flex-col">
            <strong className="text-sm">{title}</strong>
            <span className="text-xs opacity-80">{body}</span>
          </div>
        </div>
      </div>
    ), { duration: 4000 });

    // system notification (quando permitido) — sem shake/som global
    if ('Notification' in window && permission === 'granted') {
      try {
        new Notification(title, { body, icon: avatar });
      } catch {}
    }

    // Som apenas para o alerta de atenção (não no body)
    if (soundType) playSound(soundType);
  }, [permission, playSound]);

  const value: NotificationContextType = {
    playSound,
    requestPermission,
    showNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
