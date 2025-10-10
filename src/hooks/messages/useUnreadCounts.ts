
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useUnreadCounts = (user: any) => {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const loadUnreadCounts = async () => {
    if (!user) return;

    try {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', user?.id);

      if (contacts) {
        const counts: Record<string, number> = {};
        
        for (const contact of contacts) {
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('sender_id', contact.contact_id)
            .eq('receiver_id', user?.id)
            .is('viewed_at', null);
          
          counts[contact.contact_id] = unreadMessages?.length || 0;
        }
        
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadUnreadCounts();
    }
  }, [user]);

  return {
    unreadCounts,
    loadUnreadCounts,
  };
};
