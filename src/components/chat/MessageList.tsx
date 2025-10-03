
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: any[];
  currentUser: any;
  onDeleteMessage: (messageId: string, deleteFor: 'me' | 'both') => void;
  onMarkMediaAsViewed?: (messageId: string) => void;
}

export const MessageList = ({ messages, currentUser, onDeleteMessage, onMarkMediaAsViewed }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/10 chat-messages"
    >
      {messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma mensagem ainda</p>
          <p className="text-xs">Comece a conversa!</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUser?.id}
            onDelete={onDeleteMessage}
            onMarkMediaAsViewed={onMarkMediaAsViewed}
            showAvatar={
              index === 0 ||
              messages[index - 1]?.sender_id !== message.sender_id
            }
          />
        ))
      )}
    </div>
  );
};
