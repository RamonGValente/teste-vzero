import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
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

export const ContactList = ({ contacts, selectedContact, onContactSelect, unreadCounts }: ContactListProps) => {
  const { blockContact } = useBlockedContacts();
  const { callAttention, silenceNotifications } = useAttentionCalls();

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
          const prof = contact.profiles || contact;
          const online = isOnline(prof?.status, prof?.last_seen);
          return (
            <div
              key={prof.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 group",
                selectedContact?.id === prof.id && "bg-muted"
              )}
            >
              <div onClick={() => onContactSelect(contact)} className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <div className={`relative inline-flex rounded-full p-[2px] ${online ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'}`}>
                    <div className="rounded-full overflow-hidden">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={prof?.avatar_url} />
                        <AvatarFallback>{prof?.full_name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  {online && <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{prof?.full_name || 'Usuário'}</p>
                    <div className="flex items-center gap-2">
                      {online && <Badge variant="secondary" className="text-xs">Online</Badge>}
                      {unreadCounts[prof.id] > 0 && (
                        <Badge className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                          {unreadCounts[prof.id]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {online
                      ? 'Disponível'
                      : prof?.last_seen
                        ? `Visto ${formatDistanceToNow(new Date(prof.last_seen), { addSuffix: true, locale: ptBR })}`
                        : 'Última vez visto recentemente'}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCallAttention(prof.id)}>
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
                        <DropdownMenuItem key={duration.value} onClick={() => handleSilenceNotifications(prof.id, duration.value)}>
                          {duration.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={() => useBlockedContacts().blockContact(prof.id)} className="text-destructive">
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
