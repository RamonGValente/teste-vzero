import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { Button } from "@/components/ui/button";
import AudioRecorder from "@/components/AudioRecorder";
import MediaUploader from "@/components/MediaUploader";
import AttentionButton from "@/components/realtime/AttentionButton";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onAudioReady: (audioBlob: Blob) => void;
  onMediaReady: (files: File[]) => void;
  /** Se informado, exibe o botão "Chamar atenção" dentro do chat */
  attentionReceiverId?: string | null;
  disabled?: boolean;
}

export function MessageInput({ 
  onSendMessage, 
  onAudioReady, 
  onMediaReady,
  attentionReceiverId = null,
  disabled = false 
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Altura para 2 linhas (aproximadamente 44px * 2 = 88px)
  const TWO_LINES_HEIGHT = 88;

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = `${TWO_LINES_HEIGHT}px`;
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea mantendo mínimo de 2 linhas
    if (textareaRef.current) {
      const scrollHeight = textareaRef.current.scrollHeight;
      // Se o conteúdo for maior que 2 linhas, usa o scrollHeight, senão mantém 2 linhas
      const newHeight = scrollHeight > TWO_LINES_HEIGHT 
        ? Math.min(scrollHeight, 200) // Limite máximo de 200px
        : TWO_LINES_HEIGHT;
      
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  return (
    <div className="w-full border-t bg-card overflow-x-hidden flex-shrink-0">
      <div className="p-3 sm:p-4 space-y-2">
        <div className="flex items-end gap-2">
          <MediaUploader onMediaReady={onMediaReady} />
          <AudioRecorder onAudioReady={onAudioReady} maxDuration={60} />
          
          <div className="flex-1 min-w-0">
            <MentionTextarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={disabled}
              className="w-full min-h-[88px] max-h-[200px] resize-none rounded-md border border-input bg-background px-3 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ height: `${TWO_LINES_HEIGHT}px` }}
            />
          </div>

          {attentionReceiverId ? (
            <AttentionButton
              contactId={attentionReceiverId}
              className="h-[44px] w-[44px] flex-shrink-0 mb-[44px]"
            />
          ) : null}
          
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            size="icon"
            className="bg-gradient-to-r from-primary to-secondary h-[44px] w-[44px] flex-shrink-0 mb-[44px]" // Ajuste para alinhar com o topo do textarea
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}