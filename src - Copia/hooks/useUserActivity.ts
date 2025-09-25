import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUserActivity = () => {
  const { user } = useAuth();
  const sessionStart = useRef<Date | null>(null);
  const activityTimer = useRef<NodeJS.Timeout | null>(null);

  const logSession = async (minutes: number) => {
    if (!user || minutes < 1) return;

    try {
      // Log activity - this could be implemented later if needed
      console.log(`User ${user.id} was active for ${Math.round(minutes)} minutes`);
    } catch (error) {
      console.error('Error logging user session:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Start session tracking
    sessionStart.current = new Date();

    // Log activity every 5 minutes
    const logActivity = () => {
      if (sessionStart.current) {
        const now = new Date();
        const minutes = (now.getTime() - sessionStart.current.getTime()) / (1000 * 60);
        
        if (minutes >= 1) { // Only log if at least 1 minute has passed
          logSession(minutes);
          sessionStart.current = now; // Reset session start
        }
      }
    };

    // Log activity every 5 minutes
    activityTimer.current = setInterval(logActivity, 5 * 60 * 1000);

    // Log activity on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden && sessionStart.current) {
        // Page is becoming hidden, log the session
        const now = new Date();
        const minutes = (now.getTime() - sessionStart.current.getTime()) / (1000 * 60);
        if (minutes >= 1) {
          logSession(minutes);
        }
      } else if (!document.hidden) {
        // Page is becoming visible, start new session
        sessionStart.current = new Date();
      }
    };

    // Log activity on beforeunload
    const handleBeforeUnload = () => {
      if (sessionStart.current) {
        const now = new Date();
        const minutes = (now.getTime() - sessionStart.current.getTime()) / (1000 * 60);
        if (minutes >= 1) {
          // Use sendBeacon for reliability during page unload
          navigator.sendBeacon('/api/log-activity', JSON.stringify({ minutes }));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (activityTimer.current) {
        clearInterval(activityTimer.current);
      }
      
      // Log final session on cleanup
      if (sessionStart.current) {
        const now = new Date();
        const minutes = (now.getTime() - sessionStart.current.getTime()) / (1000 * 60);
        if (minutes >= 1) {
          logSession(minutes);
        }
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  return { logSession };
};