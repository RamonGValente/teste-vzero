import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { Button } from "@/components/ui/button";
import AudioRecorder from "@/components/AudioRecorder";
import MediaUploader from "@/components/MediaUploader";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onAudioReady: (audioBlob: Blob) => void;
  onMediaReady: (files: File[]) => void;
  disabled?: boolean;
}

export function MessageInput({ 
  onSendMessage, 
  onAudioReady, 
  onMediaReady,
  disabled = false 
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";
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
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="p-3 sm:p-4 border-t bg-card space-y-2 overflow-x-hidden">
      <div className="flex items-end gap-2">
        <MediaUploader onMediaReady={onMediaReady} />
        <AudioRecorder onAudioReady={onAudioReady} maxDuration={60} />
        
        <MentionTextarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          disabled={disabled}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ height: "44px" }}
        />
        
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="icon"
          className="bg-gradient-to-r from-primary to-secondary h-[44px] w-[44px] flex-shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
