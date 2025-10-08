import { useMemo } from 'react';
import { usePresenceForContacts } from '@/hooks/usePresenceForContacts';
import { ContactListItem } from '@/components/contacts/ContactListItem';

interface SidebarContactsProps {
  contacts: Array<{ id: string; full_name?: string | null; avatar_url?: string | null; status?: string | null; last_seen?: string | null }>;
  onSelect?: (contactId: string) => void;
  rightActionsFor?: (contactId: string) => React.ReactNode;
}

export function SidebarContacts({ contacts, onSelect, rightActionsFor }: SidebarContactsProps) {
  const ids = useMemo(() => contacts.map(c => c.id), [contacts]);
  const presenceMap = usePresenceForContacts(ids);

  return (
    <div className="space-y-2">
      {contacts.map((c) => (
        <ContactListItem
          key={c.id}
          contact={c}
          presence={presenceMap[c.id]}
          onClick={() => onSelect?.(c.id)}
          rightActions={rightActionsFor?.(c.id)}
        />
      ))}
    </div>
  );
}
