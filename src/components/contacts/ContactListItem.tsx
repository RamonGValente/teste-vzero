import React from 'react';
import { isOnline } from '@/lib/presence';

type Contact = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  last_seen?: string | null;
};

export function ContactListItem({
  contact,
  presence,
  onClick,
  rightActions,
}: {
  contact: Contact;
  presence?: { status?: string | null; last_seen?: string | null };
  onClick?: () => void;
  rightActions?: React.ReactNode;
}) {
  const status = presence?.status ?? contact.status ?? null;
  const lastSeen = presence?.last_seen ?? contact.last_seen ?? null;
  const online = isOnline(status, lastSeen);

  return (
    <div
      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <img
          src={contact.avatar_url || '/avatar-default.png'}
          alt={contact.full_name || contact.username || 'Contato'}
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {contact.full_name || contact.username || 'Contato'}
          </span>
          <span className={`text-xs ${online ? 'text-green-600' : 'text-muted-foreground'}`}>
            {online ? 'Online' : (lastSeen ? 'Offline • visto recentemente' : 'Offline')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
        {rightActions}
      </div>
    </div>
  );
}
