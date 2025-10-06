import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

export const useMessageStatus = (contactId?: string) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!contactId || !user) return;

    const markMessagesAsViewed = async () => {
      await supabase
        .from('messages')
        .update({ viewed_at: new Date().toISOString() })
        .eq('sender_id', contactId)
        .eq('receiver_id', user.id)
        .is('viewed_at', null);
    };

    // Mark messages as viewed when entering chat
    markMessagesAsViewed();

    // Listen for new messages and mark them as viewed
    const subscription = supabase
      .channel('message_status')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id},sender_id=eq.${contactId}`,
        },
        async (payload) => {
          // Mark new message as viewed immediately since user is in the chat
          await supabase
            .from('messages')
            .update({ viewed_at: new Date().toISOString() })
            .eq('id', payload.new.id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [contactId, user]);
};