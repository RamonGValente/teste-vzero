import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useIncomingCalls() {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Buscar chamadas pendentes quando o componente montar
  useEffect(() => {
    const fetchPendingCalls = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: calls, error } = await supabase
          .from('video_calls')
          .select(`
            *,
            caller:profiles!video_calls_caller_id_fkey(full_name, avatar_url, username)
          `)
          .eq('receiver_id', user.id)
          .eq('status', 'calling')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching pending calls:', error);
          return;
        }

        if (calls && calls.length > 0) {
          const call = calls[0];
          setIncomingCall({
            ...call,
            callerName: call.caller?.full_name || call.caller?.username || 'Usuário',
            callerAvatar: call.caller?.avatar_url
          });
        }
      } catch (err) {
        console.error('Error in fetchPendingCalls:', err);
      }
    };

    fetchPendingCalls();
  }, []);

  // Escutar por novas chamadas em tempo real
  useEffect(() => {
    let subscription: any;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Setting up realtime listener for user:', user.id);

      subscription = supabase
        .channel('video_calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_calls',
            filter: `receiver_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('New call received:', payload);
            const newCall = payload.new;
            
            if (newCall.status === 'calling') {
              // Buscar informações do caller
              const { data: callerData } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, username')
                .eq('id', newCall.caller_id)
                .single();

              const callInfo = {
                ...newCall,
                callerName: callerData?.full_name || callerData?.username || 'Usuário',
                callerAvatar: callerData?.avatar_url
              };

              setIncomingCall(callInfo);

              // Mostrar toast notification
              toast({
                title: "Chamada Recebida",
                description: `${callInfo.callerName} está te chamando`,
                duration: 10000, // 10 segundos
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
            filter: `receiver_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Call updated:', payload);
            const updatedCall = payload.new;
            
            // Se a chamada atual foi atualizada e não está mais "calling", limpar
            if (incomingCall?.id === updatedCall.id && updatedCall.status !== 'calling') {
              setIncomingCall(null);
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });

      return subscription;
    };

    setupRealtime();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [incomingCall?.id, toast]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    setIncomingCall: clearIncomingCall,
    isLoading
  };
}