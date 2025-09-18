import { useEffect, useRef } from 'react';
import { useAttentionCalls } from '@/hooks/useAttentionCalls';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useContacts } from '@/hooks/useContacts';

export const AttentionCallNotification = () => {
  const { lastIncoming } = useAttentionCalls();
  const { showNotification } = useNotifications();
  const { contacts } = useContacts();
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastIncoming) return;
    if (lastIdRef.current === lastIncoming.id) return;
    lastIdRef.current = lastIncoming.id;

    const sender = contacts.find(c => c.contact_id === lastIncoming.sender_id || c.user_id === lastIncoming.sender_id);
    const senderName = sender?.profiles?.full_name || sender?.profiles?.username || 'Contato';
    const avatar = sender?.profiles?.avatar_url || undefined;

    showNotification(senderName, `${senderName} está chamando sua atenção!`, avatar, 'attention');
  }, [lastIncoming, contacts, showNotification]);

  return null;
};
