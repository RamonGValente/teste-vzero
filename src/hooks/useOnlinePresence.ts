import { useEffect } from 'react';
import { onlineStatusService } from '@/services/onlineStatusService';
import { supabase } from '@/lib/supabase';

export function useOnlinePresence() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data?.session) {
        onlineStatusService.start();
      }

      const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session) onlineStatusService.start();
        else onlineStatusService.stop();
      });

      return () => {
        authSub.subscription.unsubscribe();
      };
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
