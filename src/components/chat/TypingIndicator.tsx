import { useEffect, useState } from 'react';
import { useContacts } from '@/hooks/useContacts';

interface TypingIndicatorProps {
  typingUserIds: string[];
}

export const TypingIndicator = ({ typingUserIds }: TypingIndicatorProps) => {
  const { contacts } = useContacts();
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    if (typingUserIds.length === 0) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [typingUserIds]);

  if (typingUserIds.length === 0) return null;

  const typingUsers = contacts.filter(contact =>
    typingUserIds.includes(contact.id)
  );

  if (typingUsers.length === 0) return null;

  const getUserName = (user: any) => user.full_name || 'Usuário';

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground">
      {typingUsers.length === 1 ? (
        <span>
          {getUserName(typingUsers[0])} está digitando{dots}
        </span>
      ) : (
        <span>
          {typingUsers.map(user => getUserName(user)).join(', ')} estão digitando{dots}
        </span>
      )}
    </div>
  );
};
