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

    const senderContact = contacts.find(c => c.id === lastIncoming.sender_id);
    const senderName = senderContact?.full_name || 'Alguém';
    const senderAvatar = senderContact?.avatar_url;

    document.body.classList.add('shake-animation');
    showNotification(`${senderName} está chamando sua atenção!`, 'Clique para ver a conversa', senderAvatar, 'attention');
    const t = setTimeout(() => document.body.classList.remove('shake-animation'), 1000);
    return () => clearTimeout(t);
  }, [lastIncoming, showNotification, contacts]);

  return null;
};
