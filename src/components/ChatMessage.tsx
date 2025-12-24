import * as React from "react";
import { Clock, Languages, Check, CheckCheck } from "lucide-react";
import { MessageType } from "./ChatInput";

interface ChatMessageProps {
  message: MessageType;
  currentUserId: string;
  onTranslate: (messageId: string) => void;
  onView: (messageId: string) => void;
}

// Função auxiliar para Tailwind CSS
function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

// Função para obter nome do idioma
function getLanguageName(code: string): string {
  const languages: { [key: string]: string } = {
    'en': 'Inglês',
    'es': 'Espanhol',
    'fr': 'Francês',
    'de': 'Alemão',
    'it': 'Italiano',
    'pt': 'Português',
    'ja': 'Japonês',
    'ko': 'Coreano',
    'zh': 'Chinês',
    'ar': 'Árabe',
    'ru': 'Russo',
    'hi': 'Hindi',
    'tr': 'Turco',
    'nl': 'Holandês',
    'sv': 'Sueco',
    'pl': 'Polonês',
    'uk': 'Ucraniano',
    'vi': 'Vietnamita',
    'th': 'Tailandês'
  };
  return languages[code] || code;
}

export function ChatMessage({ message, currentUserId, onTranslate, onView }: ChatMessageProps) {
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [isExpiring, setIsExpiring] = React.useState(false);
  const [isDeleted, setIsDeleted] = React.useState(false);
  const [showAnimation, setShowAnimation] = React.useState(false);

  const isOwnMessage = message.senderId === currentUserId;

  // Detectar quando a mensagem é visualizada pelo destinatário
  React.useEffect(() => {
    if (!isOwnMessage && !message.viewed) {
      // Simula o destinatário visualizando a mensagem após 1 segundo
      const timer = setTimeout(() => {
        onView(message.id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOwnMessage, message.viewed, message.id, onView]);

  // Contador regressivo de 2 minutos
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

      // Ativar animação quando faltar 10 segundos
      if (newTimeLeft <= 10 && newTimeLeft > 0) {
        setIsExpiring(true);
      }

      // Quando o tempo acabar, mostrar animação e depois marcar como deletada
      if (newTimeLeft === 0) {
        setIsExpiring(true);
        setShowAnimation(true);
        
        // Animação de exclusão
        setTimeout(() => {
          setIsDeleted(true);
        }, 1000);
        
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

  // Animação de mensagem apagada
  if (isDeleted) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={cn(
          "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl",
          "bg-muted/50 text-muted-foreground text-center italic border border-dashed border-muted-foreground/30",
          "animate-fade-in"
        )}>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
            <span className="text-sm">Mensagem apagada</span>
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Animação de expiração
  if (showAnimation) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={cn(
          "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl animate-pulse-fast",
          "bg-destructive/10 text-destructive border border-destructive/20",
          "animate-shake"
        )}>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="animate-spin" size={14} />
            <span>Mensagem sendo apagada...</span>
          </div>
          </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 animate-message-in`}>
      <div className={cn(
        "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl relative group transition-all duration-300",
        isOwnMessage 
          ? "bg-primary text-primary-foreground rounded-br-md shadow-sm" 
          : "bg-muted rounded-bl-md border shadow-sm",
        isExpiring && "animate-expire-pulse border-yellow-500/50"
      )}>
        
        {/* Conteúdo da mensagem */}
        {message.type === 'text' && (
          <div className="break-words">
            {/* CORREÇÃO: Usando <div> em vez de <p> para o texto principal para corrigir o warning de aninhamento DOM */}
            <div className={message.isTranslated ? "text-sm italic mb-2" : "text-base mb-2"}>
              {message.isTranslated ? message.translatedText : message.text}
            </div>
            
            {/* Informação de idioma detectado */}
            {message.language && !message.isTranslated && message.language !== 'pt' && message.language !== 'unknown' && (
              <div className="text-xs opacity-75 mt-2 flex items-center gap-1 p-2 bg-background/20 rounded-lg border border-border/50">
                <Languages size={12} />
                <span>Idioma detectado: <strong>{getLanguageName(message.language)}</strong></span>
              </div>
            )}

            {/* Indicador de mensagem traduzida */}
            {message.isTranslated && (
              <div className="text-xs opacity-60 mt-1 flex items-center gap-1">
                <Languages size={12} />
                <span>Traduzido automaticamente</span>
              </div>
            )}
          </div>
        )}

        {/* Mensagens de mídia */}
        {(message.type === 'image' || message.type === 'video') && message.fileUrl && (
          <div className="relative">
            {message.type === 'image' ? (
              <img 
                src={message.fileUrl} 
                alt="Mensagem" 
                className="rounded-lg max-w-full h-auto max-h-64 object-cover"
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
                className="rounded-lg max-w-full h-auto max-h-64"
                onLoadedData={() => {
                  if (!isOwnMessage && !message.viewed) {
                    onView(message.id);
                  }
                }}
              />
            )}
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {message.type === 'image' ? '📷 Imagem' : '🎬 Vídeo'}
            </div>
          </div>
        )}

        {message.type === 'audio' && (
          <div className={cn(
            "p-3 rounded-lg flex items-center gap-3",
            isOwnMessage ? "bg-primary/20" : "bg-muted-foreground/10"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isOwnMessage ? "bg-primary" : "bg-muted-foreground"
            )}>
              <span className="text-xs">🔊</span>
            </div>
            <div>
              <p className="text-sm font-medium">Áudio de voz</p>
              <p className="text-xs opacity-70">Clique para reproduzir</p>
            </div>
          </div>
        )}

        {/* Botão de tradução */}
        {message.language && 
         message.language !== 'pt' && 
         message.language !== 'unknown' &&
         !message.isTranslated && 
         !isOwnMessage && // Condição crucial: SÓ aparece em mensagens RECEBIDAS
         message.type === 'text' && (
          <button
            onClick={() => onTranslate(message.id)}
            className="absolute -top-2 -right-2 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-all duration-200 hover:scale-110 animate-translate-pulse"
            title={`Traduzir do ${getLanguageName(message.language)}`}
          >
            <Languages size={16} />
          </button>
        )}

        {/* Status e temporizador */}
        <div className="flex items-center justify-between mt-2 text-xs opacity-90">
          <div className="flex items-center gap-2">
            {/* Status de visualização */}
            {isOwnMessage && (
              <div className="flex items-center gap-1">
                {message.viewed ? 
                  <CheckCheck size={14} className="text-blue-500" /> : 
                  <Check size={14} className="opacity-60" />
                }
                <span className={message.viewed ? "text-blue-500" : "opacity-60"}>
                  {message.viewed ? "Entregue" : "Enviada"}
                </span>
              </div>
            )}

            {/* Temporizador regressivo - MOSTRAR PARA AMBOS OS USUÁRIOS */}
            {message.viewed && message.expiresAt && timeLeft > 0 && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 border",
                isExpiring 
                  ? "bg-destructive/20 text-destructive border-destructive/30 animate-expire-pulse" 
                  : "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
              )}>
                <Clock 
                  size={12} 
                  className={isExpiring ? "animate-clock-alert" : ""} 
                />
                <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
              </div>
            )}

            {/* Indicador de mensagem visualizada mas ainda não expirada */}
            {message.viewed && (!message.expiresAt || timeLeft === 0) && !isOwnMessage && (
              <div className="flex items-center gap-1 text-green-600 bg-green-500/20 px-2 py-1 rounded-full">
                <CheckCheck size={12} />
                <span className="text-xs">Visualizada</span>
              </div>
            )}
          </div>

          {/* Horário */}
          <span className="text-xs opacity-70 font-medium">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Indicador visual do tempo restante (barra de progresso) */}
        {message.viewed && message.expiresAt && timeLeft > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-1 mt-2 overflow-hidden">
            <div 
              className={cn(
                "h-1 rounded-full transition-all duration-1000",
                isExpiring ? "bg-destructive" : "bg-yellow-500"
              )}
              style={{ 
                width: `${(timeLeft / 120) * 100}%` 
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;