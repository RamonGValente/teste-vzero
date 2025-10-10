import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Users, Star } from 'lucide-react';

interface SocialContactsListProps {
  onUserSelect: (user: any) => void;
  selectedUser: any;
}

export default function SocialContactsList({ onUserSelect, selectedUser }: SocialContactsListProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar contatos do usuário
      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select(`
          contact:contact_id (
            id,
            full_name,
            avatar_url,
            user_code,
            status
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
    fetchContacts();
  }, []);

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

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header da Lista */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Contatos Social</h2>
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
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Users className="h-8 w-8 mb-2" />
            <p className="text-sm">Nenhum contato encontrado</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onUserSelect(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedUser?.id === contact.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.avatar_url || ''} alt={contact.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(contact.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {contact.full_name || `Usuário ${contact.user_code}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.status === 'online' ? (
                      <span className="text-green-600">● Online</span>
                    ) : (
                      <span className="text-muted-foreground">○ Offline</span>
                    )}
                  </p>
                </div>

                {contact.user_code?.includes('VIP') && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
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
  );
}