import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useAutoDeleteMessages = () => {
  useEffect(() => {
    // Function to delete expired messages
    const deleteExpiredMessages = async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      // Delete messages older than 2 minutes
      await supabase
        .from('messages')
        .delete()
        .lt('created_at', twoMinutesAgo);
    };

    // Run immediately
    deleteExpiredMessages();

    // Run every 30 seconds to clean up expired messages
    const interval = setInterval(deleteExpiredMessages, 30000);

    return () => clearInterval(interval);
  }, []);
};