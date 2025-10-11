import { supabase } from '@/integrations/supabase/client';

export async function sendAttention(receiverId: string, message?: string) {
  const { data, error } = await supabase.rpc('send_attention', {
    _receiver: receiverId,
    _message: message ?? null,
  });
  if (error) {
    if ((error as any)?.message?.includes('receiver_offline')) {
      throw new Error('O contato está offline. Não é possível enviar alerta agora.');
    }
    throw error;
  }
  return data as string;
}
