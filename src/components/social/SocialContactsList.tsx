import React, { useMemo } from 'react';
import { usePresenceForContacts } from '@/hooks/usePresenceForContacts';
import { isOnline } from '@/lib/presence';
import ContactListItem from '@/components/contacts/ContactListItem';

type Contact = { id: string; full_name?: string|null; avatar_url?: string|null; status?: string|null; last_seen?: string|null };

export default function SocialContactsList({ contacts }: { contacts: Contact[] }) {
  const contactIds = useMemo(() => (contacts || []).map((c) => String(c.id)), [contacts]);
  const presenceMap = usePresenceForContacts(contactIds);

  return (
    <div className="flex flex-col gap-1">
      {(contacts || []).map((c) => {
        const p = presenceMap[String(c.id)];
        const status = (p?.status ?? c.status ?? 'offline') as string;
        const lastSeen = p?.last_seen ?? c.last_seen ?? null;
        const online = isOnline(status, lastSeen);
        return (
          <ContactListItem
            key={String(c.id)}
            contact={c}
            presence={{ status, last_seen: lastSeen }}
          />
        );
      })}
    </div>
  );
}
