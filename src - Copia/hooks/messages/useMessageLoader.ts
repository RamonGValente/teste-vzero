
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useMessageLoader = (user: any) => {
  const [loading, setLoading] = useState(false);

  const loadMessages = async (contactId: string) => {
    if (!contactId) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Marcar mensagens como visualizadas e entregar status de leitura
      if (data && data.length > 0) {
        const unreadMessages = data.filter(msg => 
          msg.receiver_id === user?.id && !msg.viewed_at
        );
        
        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ viewed_at: new Date().toISOString() })
            .in('id', unreadMessages.map(msg => msg.id));
        }
      }

      return data || [];
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    loadMessages,
  };
};
