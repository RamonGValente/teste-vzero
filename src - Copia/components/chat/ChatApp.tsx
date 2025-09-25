import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { useContacts } from '@/hooks/useContacts';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/components/auth/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

export const ChatApp = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { contacts, addContact, removeContact, loading: contactsLoading } = useContacts();

  const {
    messages,
    sendMessage,
    deleteMessage,
    markMediaAsViewed,
    loading: messagesLoading,
  } = useMessages(selectedContact?.profiles?.id);

  const { user, profile } = useAuth();
  const isMobile = useIsMobile();

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleBackToContacts = () => {
    setSelectedContact(null);
    if (isMobile) {
      setSidebarOpen(true);
    }
  };

  const handleContactRemove = (contactId: string) => {
    removeContact(contactId);
    if (selectedContact?.profiles?.id === contactId) {
      setSelectedContact(null);
    }
  };

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        contacts={contacts}
        selectedContact={selectedContact}
        onContactSelect={handleContactSelect}
        onAddContact={addContact}
        user={user}
        profile={profile}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        unreadCounts={{}}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* TOPO: apenas a LOGO (mesmo tamanho da tela de login) */}
        <div className="w-full border-b border-border bg-card">
          <div className="flex items-center justify-between px-4">
            {/* Botão para abrir a sidebar no mobile */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Logo centralizada e grande */}
            <div className="flex-1 flex justify-center py-3">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-32 md:h-40 lg:h-52 w-auto object-contain select-none"
                draggable={false}
              />
            </div>

            {/* Espaço vazio para equilibrar a centralização da logo */}
            <div className="w-10 md:w-12" />
          </div>
        </div>

        {/* Conteúdo principal:
            - Se houver contato selecionado → ChatWindow
            - Caso contrário → tela de boas-vindas com texto impactante */}
        {selectedContact ? (
          <ChatWindow
            contact={selectedContact?.profiles}
            messages={messages}
            onSendMessage={sendMessage}
            onDeleteMessage={deleteMessage}
            onMarkMediaAsViewed={markMediaAsViewed}
            currentUser={user}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onBackToContacts={handleBackToContacts}
            onContactBlock={handleBackToContacts}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl text-center rounded-2xl border border-border bg-card/50 px-8 py-10">
              <div className="flex justify-center">
                
              </div>

              <h2 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight">
                Conversas seguras.
              </h2>

              <p className="mt-3 text-muted-foreground">
                Inicie um papo com quem importa e tenha controle total: mensagens com visualização única,
                autoexclusão privacidade avançada.    — tudo com uma experiência fluida.
              </p>

              <ul className="mt-6 text-sm md:text-base text-muted-foreground space-y-2 text-left max-w-xl mx-auto">
              
              </ul>

              <p className="mt-6 text-muted-foreground">
                Selecione um contato na barra lateral para começar a conversar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
