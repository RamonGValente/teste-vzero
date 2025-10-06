import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { updateUserStatus } from '@/lib/database';

export const useUserStatus = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const updateStatus = useCallback(async (status: 'online' | 'offline') => {
    if (user) {
      await updateUserStatus(user.id, status);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleOnline = () => {
      setIsOnline(true);
      updateStatus('online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus('offline');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('offline');
      } else {
        updateStatus('online');
      }
    };

    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    // Set initial status
    updateStatus('online');

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Periodic status update (every 30 seconds when active)
    const statusInterval = setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        updateStatus('online');
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(statusInterval);
      
      // Set offline when hook unmounts
      updateStatus('offline');
    };
  }, [user, updateStatus]);

  return { isOnline };
};