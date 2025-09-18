import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePresenceForContacts } from '@/hooks/usePresenceForContacts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useBlockedContacts } from '@/hooks/useBlockedContacts';
import { useAttentionCalls } from '@/hooks/useAttentionCalls';
import { MoreVertical, UserX, Bell, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isOnline } from '@/lib/presence';

interface ContactListProps {
  contacts: any[];
  selectedContact: any;
  onContactSelect: (contact: any) => void;
  unreadCounts: Record<string, number>;
}

export const ContactList = ({
  contacts,
  selectedContact,
  onContactSelect,
  unreadCounts,
}: ContactListProps) => {
  const { blockContact } = useBlockedContacts();
  const { callAttention, silenceNotifications } = useAttentionCalls();

  // Mapa de presença em tempo real (status + last_seen) para a lista toda
  const presenceMap = usePresenceForContacts(
    contacts?.map((c) => c.profiles?.id || c.contact_id || c.id)
  );

  const handleBlockContact = async (contactId: string) => {
    await blockContact(contactId);
  };

  const handleCallAttention = async (contactId: string) => {
    await callAttention(contactId);
  };

  const handleSilenceNotifications = async (contactId: string, duration: number) => {
    await silenceNotifications(contactId, duration);
  };

  const silenceDurations = [
    { label: '15 minutos', value: 15 * 60 * 1000 },
    { label: '1 hora', value: 60 * 60 * 1000 },
    { label: '6 horas', value: 6 * 60 * 60 * 1000 },
    { label: '12 horas', value: 12 * 60 * 60 * 1000 },
    { label: '24 horas', value: 24 * 60 * 60 * 1000 },
  ];

  return (
    <div className="p-2">
      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum contato ainda</p>
          <p className="text-xs">Adicione contatos por e-mail</p>
        </div>
      ) : (
        contacts.map((contact) => {
          const id = contact.profiles?.id || contact.contact_id || contact.id;
          const p = presenceMap[id];
          const online = isOnline(
            p?.status ?? contact.profiles?.status,
            p?.last_seen ?? contact.profiles?.last_seen
          );
          const ring =
            online
              ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background'
              : 'ring-2 ring-red-500 ring-offset-2 ring-offset-background';
          const lastSeen = p?.last_seen ?? contact.profiles?.last_seen ?? null;

          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 group',
                selectedContact?.id === contact.profiles?.id && 'bg-muted'
              )}
            >
              <div
                onClick={() => onContactSelect(contact)}
                className="flex items-center gap-3 flex-1"
              >
                {/* Avatar com anel verde/vermelho */}
                <div className={`relative inline-flex rounded-full p-[2px] ${ring}`}>
                  <div className="rounded-full overflow-hidden">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {contact.profiles?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {contact.profiles?.full_name || 'Usuário'}
                    </p>
                    <div className="flex items-center gap-2">
                      {online && <Badge variant="secondary" className="text-xs">Online</Badge>}
                      {unreadCounts[id] > 0 && (
                        <Badge className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                          {unreadCounts[id]}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground truncate">
                    {online
                      ? 'Disponível'
                      : lastSeen
                        ? `Visto ${formatDistanceToNow(new Date(lastSeen), {
                            addSuffix: true,
                            locale: ptBR,
                          })}`
                        : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Ações do contato */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCallAttention(id)}>
                    <Bell className="h-4 w-4 mr-2" />
                    Chamar Atenção
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <BellOff className="h-4 w-4 mr-2" />
                      Silenciar Notificações
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {silenceDurations.map((duration) => (
                        <DropdownMenuItem
                          key={duration.value}
                          onClick={() => handleSilenceNotifications(id, duration.value)}
                        >
                          {duration.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem
                    onClick={() => handleBlockContact(id)}
                    className="text-destructive"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Bloquear
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })
      )}
    </div>
  );
};
