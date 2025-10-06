
import { createContext, useContext, useEffect, useState } from 'react';
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
  const { playSound: playCustomSound } = useNotificationSounds();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const playSound = (soundType: 'message' | 'attention') => {
    playCustomSound(soundType);
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  const showNotification = (title: string, body: string, avatar?: string, soundType: 'message' | 'attention' = 'message') => {
    // Play sound
    playSound(soundType);

    if (permission === 'granted') {
      new Notification(title, {
        body,
        icon: avatar || '/favicon.ico',
        badge: '/favicon.ico',
      });
    } else {
      // Show visual toast with avatar
      toast(title, { 
        description: body,
        action: avatar ? {
          label: <Avatar className="h-6 w-6">
            <AvatarImage src={avatar} />
            <AvatarFallback className="text-xs">
              {title.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>,
          onClick: () => {}
        } : undefined
      });
    }
  };

  const value = {
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
