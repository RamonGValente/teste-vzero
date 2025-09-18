import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';

/**
 * Listener GLOBAL para INSERTs em public.attention_calls destinados ao usuário logado.
 * - Funciona em QUALQUER tela/rota.
 * - Busca o nome/avatar do remetente via JOIN em attention_calls → profiles (sender_id)
 *   e faz fallback direto em profiles.
 * - Dispara notificação com som e efeito shake (somente no toast).
 */
export const RealtimeAttentionListener = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSenderInfo = async (
      senderId: string,
      callId?: string
    ): Promise<{ name: string; avatar?: string }> => {
      if (callId) {
        try {
          const { data, error } = await supabase
            .from('attention_calls')
            .select('id, sender:sender_id ( full_name, email, user_code, avatar_url )')
            .eq('id', callId)
            .single();
          if (!error && data && (data as any).sender) {
            const s: any = (data as any).sender;
            const emailName = typeof s?.email === 'string' ? s.email.split('@')[0] : '';
            const name =
              (typeof s?.full_name === 'string' && s.full_name.trim()) ||
              (emailName && emailName.trim()) ||
              (typeof s?.user_code === 'string' && s.user_code.trim()) ||
              (senderId ? `Usuário ${senderId.slice(0, 8)}` : 'Usuário');
            return { name, avatar: s?.avatar_url || undefined };
          }
        } catch (e) {
          // ignora e usa fallback
        }
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email, user_code, avatar_url')
          .eq('id', senderId)
          .single();
        if (error) throw error;
        const emailName = typeof data?.email === 'string' ? data.email.split('@')[0] : '';
        const name =
          (typeof data?.full_name === 'string' && data.full_name.trim()) ||
          (emailName && emailName.trim()) ||
          (typeof data?.user_code === 'string' && data.user_code.trim()) ||
          (senderId ? `Usuário ${senderId.slice(0, 8)}` : 'Usuário');
        return { name, avatar: (data as any)?.avatar_url || undefined };
      } catch (e) {
        const shortId = senderId ? senderId.slice(0, 8) : '';
        return { name: shortId ? `Usuário ${shortId}` : 'Usuário', avatar: undefined };
      }
    };

    const ch = supabase
      .channel('attention_calls_realtime_global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attention_calls',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const id = payload?.new?.id as string | undefined;
          if (!id || lastIdRef.current === id) return;
          lastIdRef.current = id;

          const senderId = payload?.new?.sender_id as string | undefined;
          const { name, avatar } = await fetchSenderInfo(senderId || '', id);
          showNotification(name, `${name} está chamando sua atenção!`, avatar, 'attention');
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(ch); } catch (e) {}
    };
  }, [user?.id, showNotification]);

  return null;
};
