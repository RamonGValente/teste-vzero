import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useAttentionCalls() {
  const { user } = useAuth();

  const callAttention = useCallback(async (receiverId: string, message?: string | null) => {
    if (!user?.id) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase
      .from('attention_calls')
      .insert({ sender_id: user.id, receiver_id: receiverId, message: message ?? null })
      .select('id')
      .single();
    if (error) throw error;
    return data?.id as string;
  }, [user?.id]);

  const silenceNotifications = useCallback(async (senderId: string, until: Date) => {
    if (!user?.id) throw new Error('Usuário não autenticado');
    const { error } = await supabase
      .from('attention_silence_settings')
      .upsert({
        user_id: user.id,
        sender_id: senderId,
        silenced_until: until.toISOString(),
      }, { onConflict: 'user_id,sender_id' });
    if (error) throw error;
    return true;
  }, [user?.id]);

  return { callAttention, silenceNotifications };
}
