import { useMemo } from 'react';
import { usePresenceForContacts } from '@/hooks/usePresenceForContacts';
import { ContactListItem } from '@/components/contacts/ContactListItem';

export function SidebarContacts({ contacts, onSelect }: { contacts: any[], onSelect?: (id: string) => void }) {
  const ids = useMemo(() => contacts.map(c => String(c.id)), [contacts]);
  const presence = usePresenceForContacts(ids);
  return (
    <div className="space-y-2">
      {contacts.map(c => (
        <ContactListItem key={c.id} contact={c} presence={presence[c.id]} onClick={() => onSelect?.(c.id)} />
      ))}
    </div>
  );
}
