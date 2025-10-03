import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactListItemProps {
  contact: { id: string; full_name?: string | null; avatar_url?: string | null; status?: string | null; last_seen?: string | null };
  presence?: { status: string; last_seen: string | null };
  onClick?: () => void;
  rightActions?: React.ReactNode;
}

export function ContactListItem({ contact, presence, onClick, rightActions }: ContactListItemProps) {
  const status = (presence?.status ?? contact.status ?? 'offline') as string;
  const online = status === 'online';
  const lastSeen = presence?.last_seen ?? contact.last_seen ?? null;

  const ringClass = online ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : 'ring-2 ring-red-500 ring-offset-2 ring-offset-background';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-accent cursor-pointer select-none" onClick={onClick}>
      <div className={`relative inline-flex rounded-full p-[2px] ${ringClass}`}>
        <div className="rounded-full overflow-hidden">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.avatar_url || undefined} />
            <AvatarFallback>{(contact.full_name?.charAt(0)?.toUpperCase() ?? 'U')}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{contact.full_name || 'Usuário'}</div>
        <div className="text-xs text-muted-foreground truncate">
          {online ? 'Online' : (lastSeen ? `Visto há ${formatDistanceToNow(new Date(lastSeen), { addSuffix: false, locale: ptBR })}` : 'Offline')}
        </div>
      </div>
      {rightActions ? <div className="flex-shrink-0">{rightActions}</div> : null}
    </div>
  );
}
