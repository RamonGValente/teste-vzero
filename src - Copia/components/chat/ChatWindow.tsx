import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageList } from './MessageList';
import { QuickReplies } from './QuickReplies';
import { ContactRanking } from './ContactRanking';
import { MediaMessageInput } from './MediaMessageInput';
import { TypingIndicator } from './TypingIndicator';
import { AttentionCallButton } from './AttentionCallButton';
import { Menu, ArrowLeft, MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMessageStatus } from '@/hooks/useMessageStatus';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useContactPresence } from '@/hooks/useContactPresence';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BlockContactButton } from './BlockContactButton';
import { isOnline } from '@/lib/presence';

interface ChatWindowProps {
  contact?: any;
  messages: any[];
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file' | 'audio', fileUrl?: string) => void;
  onDeleteMessage: (messageId: string, deleteFor: 'me' | 'both') => void;
  onMarkMediaAsViewed?: (messageId: string) => void;
  currentUser: any;
  onToggleSidebar: () => void;
  onBackToContacts?: () => void;
  unreadCount?: number;
  onContactBlock?: () => void;
}

export const ChatWindow = ({
  contact,
  messages,
  onSendMessage,
  onDeleteMessage,
  onMarkMediaAsViewed,
  currentUser,
  onToggleSidebar,
  onBackToContacts,
  unreadCount = 0,
  onContactBlock,
}: ChatWindowProps) => {
  const { contactOnline, status, lastSeen } = useContactPresence(contact?.id);
  const headerOnline = isOnline(status, lastSeen || null);

  const [newMessage, setNewMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { moderateContent } = useAIAssistant();
  const { typingUsers, startTyping, stopTyping } = useTypingStatus(contact?.id);

  // Marca mensagens como lidas para o contato atual
  useMessageStatus(contact?.id);

  // Botão físico Android (volta para lista)
  useAndroidBackButton(() => {
    if (onBackToContacts) onBackToContacts();
  });

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const moderation = await moderateContent(newMessage);
    if (!moderation.approved) {
      alert(`⚠️ Mensagem bloqueada: ${moderation.reason}`);
      return;
    }

    onSendMessage(newMessage);
    setNewMessage('');
    setTimeout(() => scrollToBottom(true), 10);
    stopTyping();
  };

  const handleQuickReply = (reply: string) => {
    setNewMessage(reply);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNewMessage(v);
    if (v.trim()) startTyping();
    else stopTyping();
  };

  const handleBackButton = () => {
    if (isMobile) onToggleSidebar();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [contact?.id]);

  useEffect(() => {
    scrollToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, contact?.id]);

  useEffect(() => {
    return () => stopTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col bg-muted/20 h-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card md:hidden flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain select-none" draggable={false} />
          <div className="w-9" />
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="text-center px-6">
            <img src="/logo.png" alt="Logo" className="h-24 md:h-28 lg:h-32 w-auto object-contain select-none mx-auto mb-4" draggable={false} />
            <p className="text-muted-foreground">Selecione um contato para começar a conversar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header fixo */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card flex-shrink-0 z-10">
        <Button variant="ghost" size="sm" onClick={handleBackButton} className="md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="hidden md:block">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Avatar com anel verde/vermelho (header) */}
        <div className="relative">
          <div className={`relative inline-flex rounded-full p-[2px] ${headerOnline ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'}`}>
            <div className="rounded-full overflow-hidden">
              <Avatar className="h-10 w-10">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback>
                  {contact.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{contact.full_name || 'Usuário'}</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {headerOnline
              ? 'Online'
              : lastSeen
                ? `Visto por último ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ptBR })}`
                : 'Offline'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ContactRanking />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <BlockContactButton
                contactId={contact.id}
                contactName={contact.full_name || 'Usuário'}
                onBlock={onContactBlock}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mensagens + auto-scroll */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto px-0">
          <MessageList
            messages={messages}
            currentUser={currentUser}
            onDeleteMessage={onDeleteMessage}
            onMarkMediaAsViewed={onMarkMediaAsViewed}
          />
          <div ref={bottomRef} />
        </div>
        <TypingIndicator typingUserIds={typingUsers} />
      </div>

      {/* Rodapé: botões + input */}
      <div className="border-t border-border bg-card flex-shrink-0">
        <QuickReplies
          lastMessage={messages[messages.length - 1]}
          messages={messages}
          onSelectReply={handleQuickReply}
          isVisible={!currentUser || messages[messages.length - 1]?.sender_id !== currentUser.id}
        />

        <MediaMessageInput onSendMessage={onSendMessage} />

        <div className="p-4 pt-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            {/* Sino no rodapé: só habilita quando online */}
            <AttentionCallButton
              contactId={contact.id}
              contactName={contact.full_name || 'Usuário'}
              contactOnline={headerOnline}
            />

            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Digite uma mensagem..."
              className="flex-1"
              onBlur={stopTyping}
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              Enviar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
