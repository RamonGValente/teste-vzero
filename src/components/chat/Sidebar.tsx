import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ContactList } from './ContactList';
import { UserProfile } from './UserProfile';
import { ContactInvitations } from './ContactInvitations';
import { BlockedContacts } from './BlockedContacts';
import { AddContactByCode } from './AddContactByCode';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { Moon, Bell, UserPlus, Settings, Users } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useTranslation } from '@/components/i18n/LanguageProvider';
import { useContactInvitations } from '@/hooks/useContactInvitations';

interface SidebarProps {
  contacts: any[];
  selectedContact: any;
  onContactSelect: (contact: any) => void;
  onAddContact: (email: string) => Promise<void>;
  user: any;
  profile: any;
  isOpen: boolean;
  onToggle: () => void;
  unreadCounts: Record<string, number>;
}

type SidebarView = 'contacts' | 'invitations' | 'blocked' | 'settings';

export const Sidebar = ({
  contacts,
  selectedContact,
  onContactSelect,
  onAddContact,
  user,
  profile,
  isOpen,
  onToggle,
  unreadCounts
}: SidebarProps) => {
  const [newContactEmail, setNewContactEmail] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [currentView, setCurrentView] = useState<SidebarView>('contacts');
  const { toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { invitations } = useContactInvitations();
  const navigate = useNavigate();

  const pendingInvitations = invitations.filter(inv => 
    inv.status === 'pending' && inv.receiver_id !== inv.sender_id
  );

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactEmail.trim()) return;

    setAddingContact(true);
    try {
      await onAddContact(newContactEmail);
      setNewContactEmail('');
    } finally {
      setAddingContact(false);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'invitations':
        return <ContactInvitations />;
      case 'blocked':
        return <BlockedContacts />;
      case 'settings':
        return (
          <SettingsPage 
            onBack={() => setCurrentView('contacts')} 
            user={user} 
            profile={profile} 
          />
        );
      default:
        return (
          <>
            {/* Add Contact */}
            <div className="p-4 border-b border-border space-y-3">
              <form onSubmit={handleAddContact} className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('contacts.addByEmail')}
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={addingContact} size="sm">
                  {addingContact ? '...' : t('contacts.add')}
                </Button>
              </form>
              
              <AddContactByCode />
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto">
              <ContactList
                contacts={contacts}
                selectedContact={selectedContact}
                onContactSelect={onContactSelect}
                unreadCounts={unreadCounts}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className={`w-80 bg-card border-r border-border flex flex-col transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } md:translate-x-0 fixed md:relative z-50 h-full`}>
      {/* Header (apenas a logo - mesmo tamanho da tela de login) */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-32 md:h-40 lg:h-52 w-auto object-contain select-none"
              draggable={false}
            />
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              <Moon className="h-4 w-4" />
            </Button>
            {/* Configurações DESATIVADO (no lugar do antigo botão Rede Social) */}
            <Button
              variant="ghost"
              size="sm"
              aria-disabled="true"
              disabled
              className="pointer-events-none cursor-default text-muted-foreground"
              title="Configurações"
              aria-label="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <UserProfile user={user} profile={profile} />

        {/* Navigation */}
        <div className="flex gap-1 mt-4">
          <Button
            variant={currentView === 'contacts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('contacts')}
            className="flex-1"
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant={currentView === 'invitations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('invitations')}
            className="flex-1 relative"
          >
            <UserPlus className="h-4 w-4" />
            {pendingInvitations.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center">
                {pendingInvitations.length}
              </Badge>
            )}
          </Button>
          {/* Troca: aqui entra Rede Social (no lugar do antigo Configurações) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/social')}
            className="flex-1"
            title="Rede Social"
            aria-label="Rede Social"
          >
            <Globe className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};
