
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useMessageOperations = (user: any) => {
  const sendMessage = async (
    contactId: string,
    content: string,
    type: 'text' | 'image' | 'file' | 'audio' = 'text',
    fileUrl?: string
  ) => {
    if (!contactId || !content.trim()) return;

    try {
      const messageData: any = {
        sender_id: user?.id,
        receiver_id: contactId,
        content,
        message_type: type,
        file_url: fileUrl,
        is_encrypted: true,
        delivered_at: new Date().toISOString(),
      };

      // Para mensagens de mídia, definir single_view como true
      if (type !== 'text') {
        messageData.single_view = true;
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const deleteMessage = async (messageId: string, deleteFor: 'me' | 'both') => {
    try {
      if (deleteFor === 'both') {
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deleted_messages')
          .insert({
            message_id: messageId,
            user_id: user?.id,
          });

        if (error) throw error;
      }
      
      toast.success('Mensagem apagada');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao apagar mensagem');
    }
  };

  const markMediaAsViewed = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ 
          viewed_at: new Date().toISOString(),
          auto_delete_at: new Date(Date.now() + 120000).toISOString() // Delete in 1 second
        })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking media as viewed:', error);
    }
  };

  return {
    sendMessage,
    deleteMessage,
    markMediaAsViewed,
  };
};
