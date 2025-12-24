import * as React from "react";
import { cn } from "@/lib/utils";
import { Paperclip, Mic, Square, Send, Clock, Languages, Check, CheckCheck } from "lucide-react";

// ========== TIPOS ==========
export type MessageType = {
  id: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'audio';
  fileUrl?: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  viewed: boolean;
  expiresAt?: Date;
  language?: string;
  translatedText?: string;
  isTranslated?: boolean;
};

// ========== CHAT INPUT ==========
type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onUploadFiles: (files: File[]) => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
  isRecording?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function ChatInput({
  value = "",
  onChange,
  onSend,
  onUploadFiles,
  onRecordStart,
  onRecordStop,
  isRecording,
  disabled,
  placeholder,
}: ChatInputProps) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    };
    resize();
    const handler = () => resize();
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, []);

  const pickFiles = () => fileRef.current?.click();
  const onPicked: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) onUploadFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-end gap-2">
      <button
        type="button"
        onClick={pickFiles}
        className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center hover:bg-accent"
        title="Enviar foto ou vídeo"
      >
        <Paperclip size={18} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        multiple
        onChange={onPicked}
      />

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Digite uma mensagem..."}
        disabled={disabled}
        className={cn(
          "flex-1 min-h-[56px] max-h-52 resize-none rounded-xl border border-input bg-background/95",
          "px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground leading-5"
        )}
      />

      {!isRecording ? (
        <button
          type="button"
          onClick={onRecordStart}
          disabled={disabled}
          className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center hover:bg-accent disabled:opacity-50"
          title="Gravar áudio"
        >
          <Mic size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onRecordStop}
          className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center bg-destructive text-destructive-foreground hover:opacity-90"
          title="Parar gravação"
        >
          <Square size={18} />
        </button>
      )}

      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value?.trim()}
        className="h-11 shrink-0 rounded-xl px-4 border bg-primary text-primary-foreground disabled:opacity-50"
        title="Enviar"
      >
        <Send size={18} />
      </button>
    </div>
  );
}

// ========== CHAT MESSAGE ==========
interface ChatMessageProps {
  message: MessageType;
  currentUserId: string;
  onTranslate: (messageId: string) => void;
  onView: (messageId: string) => void;
}

function ChatMessage({ message, currentUserId, onTranslate, onView }: ChatMessageProps) {
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [isExpiring, setIsExpiring] = React.useState(false);
  const [isDeleted, setIsDeleted] = React.useState(false);

  const isOwnMessage = message.senderId === currentUserId;

  // Detectar quando a mensagem é visualizada
  React.useEffect(() => {
    if (!isOwnMessage && !message.viewed) {
      onView(message.id);
    }
  }, [isOwnMessage, message.viewed, message.id, onView]);

  // Contador regressivo
  React.useEffect(() => {
    if (!message.viewed || !message.expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expires = new Date(message.expiresAt!).getTime();
      return Math.max(0, Math.floor((expires - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 3 && newTimeLeft > 0) {
        setIsExpiring(true);
      }

      if (newTimeLeft === 0) {
        setIsExpiring(true);
        setTimeout(() => {
          setIsDeleted(true);
        }, 500);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [message.viewed, message.expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isDeleted) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={cn(
          "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl animate-pulse",
          "bg-muted text-muted-foreground text-center italic"
        )}>
          Mensagem apagada
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={cn(
        "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative group",
        isOwnMessage 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted rounded-bl-md"
      )}>
        {/* Conteúdo da mensagem */}
        {message.type === 'text' && (
          <div className="break-words">
            <p className={message.isTranslated ? "text-sm italic" : ""}>
              {message.isTranslated ? message.translatedText : message.text}
            </p>
            
            {/* Informação de idioma para mensagens não traduzidas */}
            {message.language && !message.isTranslated && message.language !== 'pt' && (
              <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
                <Languages size={12} />
                Idioma: {message.language}
              </div>
            )}
          </div>
        )}

        {(message.type === 'image' || message.type === 'video') && message.fileUrl && (
          <div className="relative">
            {message.type === 'image' ? (
              <img 
                src={message.fileUrl} 
                alt="Mensagem" 
                className="rounded-lg max-w-full h-auto"
                onLoad={() => {
                  if (!isOwnMessage && !message.viewed) {
                    onView(message.id);
                  }
                }}
              />
            ) : (
              <video 
                src={message.fileUrl} 
                controls 
                className="rounded-lg max-w-full h-auto"
                onLoadedData={() => {
                  if (!isOwnMessage && !message.viewed) {
                    onView(message.id);
                  }
                }}
              />
            )}
          </div>
        )}

        {message.type === 'audio' && (
          <div className="bg-muted-foreground/10 p-3 rounded-lg">
            <p className="text-sm">🎤 Áudio de voz</p>
          </div>
        )}

        {/* Botão de tradução */}
        {message.language && 
         message.language !== 'pt' && 
         !message.isTranslated && 
         !isOwnMessage && 
         message.type === 'text' && (
          <button
            onClick={() => onTranslate(message.id)}
            className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
            title="Traduzir mensagem"
          >
            <Languages size={14} />
          </button>
        )}

        {/* Status e temporizador */}
        <div className="flex items-center justify-between mt-1 text-xs opacity-75">
          <div className="flex items-center gap-2">
            {/* Status de visualização */}
            {isOwnMessage && (
              message.viewed ? <CheckCheck size={12} /> : <Check size={12} />
            )}

            {/* Temporizador */}
            {message.viewed && message.expiresAt && timeLeft > 0 && (
              <div className={cn(
                "flex items-center gap-1 transition-all",
                isExpiring && "text-red-500 animate-pulse"
              )}>
                <Clock size={12} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          {/* Horário */}
          <span className="ml-2">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ========== LANGUAGE SERVICE ==========
class LanguageService {
  private languagePatterns = {
    'en': /\b(the|and|is|in|to|of|a|an)\b/i,
    'es': /\b(el|la|los|las|y|en|de|que)\b/i,
    'fr': /\b(le|la|les|et|en|de|que|un|une)\b/i,
    'de': /\b(der|die|das|und|in|zu|den)\b/i,
    'it': /\b(il|la|i|le|e|in|di|che)\b/i,
    'pt': /\b(o|a|os|as|e|em|de|que|um|uma)\b/i,
    'ja': /[\u3040-\u309F\u30A0-\u30FF]/,
    'ko': /[\uAC00-\uD7AF]/,
    'zh': /[\u4E00-\u9FFF]/,
    'ar': /[\u0600-\u06FF]/,
    'ru': /[\u0400-\u04FF]/
  };

  detectLanguage(text: string): string {
    if (text.length < 3) return 'unknown';

    const scores: { [key: string]: number } = {};
    let totalScore = 0;

    for (const [lang, pattern] of Object.entries(this.languagePatterns)) {
      const matches = text.match(pattern);
      const score = matches ? matches.length : 0;
      scores[lang] = score;
      totalScore += score;
    }

    if (totalScore === 0) return 'unknown';

    let detectedLang = 'unknown';
    let maxScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }

  async translateText(text: string, targetLang: string = 'pt'): Promise<string> {
    const translations: { [key: string]: string } = {
      'en': `[Traduzido do Inglês] ${text}`,
      'es': `[Traducido del Español] ${text}`,
      'fr': `[Traduit du Français] ${text}`,
      'de': `[Übersetzt aus Deutsch] ${text}`,
      'it': `[Tradotto dall'Italiano] ${text}`,
      'ja': `[日本語から翻訳] ${text}`,
      'ko': `[한국어 번역] ${text}`,
      'zh': `[中文翻译] ${text}`
    };

    await new Promise(resolve => setTimeout(resolve, 500));
    
    return translations[targetLang] || `[Traduzido] ${text}`;
  }
}

// ========== CHAT CONTAINER ==========
export default function ChatContainer() {
  const [messages, setMessages] = React.useState<MessageType[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState<string | null>(null);
  const currentUserId = "user1";
  const languageService = new LanguageService();

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const detectedLang = languageService.detectLanguage(inputValue);
    
    const newMessage: MessageType = {
      id: Date.now().toString(),
      text: inputValue,
      type: 'text',
      senderId: currentUserId,
      receiverId: 'user2',
      timestamp: new Date(),
      viewed: false,
      language: detectedLang
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
  };

  const handleUploadFiles = (files: File[]) => {
    files.forEach(file => {
      const fileUrl = URL.createObjectURL(file);
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      const detectedLang = 'file';

      const newMessage: MessageType = {
        id: Date.now().toString() + Math.random(),
        text: type === 'image' ? 'Imagem enviada' : 'Vídeo enviado',
        type,
        fileUrl,
        senderId: currentUserId,
        receiverId: 'user2',
        timestamp: new Date(),
        viewed: false,
        language: detectedLang
      };

      setMessages(prev => [...prev, newMessage]);
    });
  };

  const handleRecordStart = () => {
    setIsRecording(true);
  };

  const handleRecordStop = () => {
    setIsRecording(false);
    const newMessage: MessageType = {
      id: Date.now().toString(),
      text: 'Áudio enviado',
      type: 'audio',
      senderId: currentUserId,
      receiverId: 'user2',
      timestamp: new Date(),
      viewed: false,
      language: 'audio'
    };

    setMessages(prev => [...prev, newMessage]);
  };

  const handleMessageView = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && !msg.viewed) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 2);
        
        return {
          ...msg,
          viewed: true,
          expiresAt
        };
      }
      return msg;
    }));
  };

  const handleTranslate = async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !message.language || message.isTranslated) return;

    setIsTranslating(messageId);
    
    try {
      const translatedText = await languageService.translateText(message.text, message.language);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              translatedText, 
              isTranslated: true 
            }
          : msg
      ));
    } catch (error) {
      console.error('Erro na tradução:', error);
    } finally {
      setIsTranslating(null);
    }
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setMessages(prev => prev.filter(msg => 
        !msg.expiresAt || msg.expiresAt > now
      ));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Cabeçalho do chat */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
          U2
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Usuário 2</h2>
          <p className="text-xs text-muted-foreground">Online - Mensagens auto-destrutivas</p>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onTranslate={handleTranslate}
            onView={handleMessageView}
          />
        ))}
        
        {isTranslating && (
          <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-muted text-muted-foreground text-sm">
              Traduzindo mensagem...
            </div>
          </div>
        )}
        
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
            <p className="text-sm mt-2">Envie uma mensagem para iniciar a conversa</p>
            <p className="text-xs mt-4 text-muted-foreground/70">
              💡 As mensagens serão automaticamente excluídas 2 minutos após serem visualizadas
            </p>
          </div>
        )}
      </div>

      {/* Input de chat */}
      <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onUploadFiles={handleUploadFiles}
          onRecordStart={handleRecordStart}
          onRecordStop={handleRecordStop}
          isRecording={isRecording}
          placeholder="Digite uma mensagem..."
        />
      </div>
    </div>
  );
}