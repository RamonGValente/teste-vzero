
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useMessageSubscription = (
  contactId: string | undefined,
  user: any,
  onNewMessage: (message: any) => void,
  onUnreadCountChange: () => void
) => {
  useEffect(() => {
    if (!contactId || !user) return;

    const subscription = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new;
          if (
            (newMessage.sender_id === user?.id && newMessage.receiver_id === contactId) ||
            (newMessage.sender_id === contactId && newMessage.receiver_id === user?.id)
          ) {
            onNewMessage(newMessage);
            onUnreadCountChange();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [contactId, user, onNewMessage, onUnreadCountChange]);
};
