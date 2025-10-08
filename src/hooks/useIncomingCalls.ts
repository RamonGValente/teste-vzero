import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useIncomingCalls() {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let userId: string;

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) return;

      const subscription = supabase
        .channel('video_calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_calls',
            filter: `receiver_id=eq.${userId}`
          },
          async (payload) => {
            const newCall = payload.new;
            if (newCall.status === 'calling') {
              const { data: callerData } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', newCall.caller_id)
                .single();

              setIncomingCall({
                ...newCall,
                callerName: callerData?.full_name || 'Usuário',
                callerAvatar: callerData?.avatar_url
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'video_calls',
            filter: `receiver_id=eq.${userId}`
          },
          (payload) => {
            const updatedCall = payload.new;
            if (incomingCall?.id === updatedCall.id && updatedCall.status !== 'calling') {
              setIncomingCall(null);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    initialize();
  }, [incomingCall?.id]);

  return {
    incomingCall,
    setIncomingCall,
    isLoading
  };
}