import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Users, X, Star, MessageCircle } from 'lucide-react';

interface SocialContactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialContactsPanel({ isOpen, onClose }: SocialContactsPanelProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select(`
          contact:contact_id (
            id,
            full_name,
            avatar_url,
            user_code,
            status,
            last_seen
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao buscar contatos:', error);
        return;
      }

      const contactProfiles = contactsData?.map(item => item.contact) || [];
      setContacts(contactProfiles);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const filteredContacts = contacts.filter(contact =>
    contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.user_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLastSeen = (lastSeen: string) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return `${Math.floor(diffMinutes / 1440)}d`;
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Painel de Contatos */}
      <div className={`
        fixed inset-y-0 right-0 w-80 bg-card border-l border-border transform transition-transform duration-300 z-50
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:translate-x-0 md:z-auto
      `}>
        {/* Header do Painel */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Contatos Social</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-120px)]">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground p-4">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">Nenhum contato encontrado</p>
              {searchTerm && (
                <p className="text-xs mt-1">Tente buscar com outros termos</p>
              )}
            </div>
          ) : (
            <div className="p-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 group"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar_url || ''} alt={contact.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(contact.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground text-sm truncate">
                        {contact.full_name || `Usuário ${contact.user_code}`}
                      </p>
                      {contact.user_code?.includes('VIP') && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {contact.status === 'online' ? (
                        <>
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Online
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                          Visto {getLastSeen(contact.last_seen)}
                        </>
                      )}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Enviar mensagem"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer do Painel */}
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredContacts.length} contatos</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {contacts.filter(c => c.status === 'online').length} online
            </span>
          </div>
        </div>
      </div>
    </>
  );
}