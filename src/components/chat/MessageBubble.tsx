
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SelfDestructAnimation } from './SelfDestructAnimation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Play, Pause, Clock, Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  onDelete: (messageId: string, deleteFor: 'me' | 'both') => void;
  onMarkMediaAsViewed?: (messageId: string) => void;
  showAvatar: boolean;
}

export const MessageBubble = ({ message, isOwn, onDelete, onMarkMediaAsViewed, showAvatar }: MessageBubbleProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [hasBeenRead, setHasBeenRead] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [showCountdown, setShowCountdown] = useState(false);
  const [mediaViewed, setMediaViewed] = useState(false);
  const [isDestructing, setIsDestructing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    if (message.message_type !== 'text') {
      setDisplayText(message.content);
      setHasBeenRead(true);
      return;
    }

    // Type out text messages letter by letter
    let currentIndex = 0;
    const fullText = message.content;
    
    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setHasBeenRead(true);
        
        // Start countdown for text messages when viewed
        if (!isOwn && message.message_type === 'text') {
          setShowCountdown(true);
          startCountdown(fullText);
        }
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [isVisible, message.content, message.message_type, isOwn]);

  const startCountdown = (fullText: string) => {
    let timeRemaining = 120; // 2 minutes
    
    const countdownInterval = setInterval(() => {
      timeRemaining--;
      setTimeLeft(timeRemaining);
      
      if (timeRemaining <= 0) {
      try { onDelete(message.id, 'both'); } catch (e) { console.error(e); } // delete DB after countdown
        clearInterval(countdownInterval);
        setIsDestructing(true);
        setTimeout(() => {
          startDisappearingEffect(fullText);
        }, 2000); // Give time for animation
      }
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  };

  const startDisappearingEffect = (fullText: string) => {
    let currentLength = fullText.length;
    
    const disappearInterval = setInterval(() => {
      if (currentLength > 0) {
        currentLength--;
        setDisplayText(fullText.slice(0, currentLength));
      } else {
        clearInterval(disappearInterval);
        setDisplayText('*mensagem apagada*');
        setShowCountdown(false);
      }
    }, 100);
  };

  const handleMediaPlay = async () => {
    if (message.message_type === 'audio') {
      const audio = new Audio(message.file_url);
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          if (!mediaViewed) {
            setMediaViewed(true);
            setIsDestructing(true);
            onMarkMediaAsViewed?.(message.id);
            setTimeout(() => {
              onDelete(message.id, 'both');
            }, 2000); // Time for animation
          }
        };
      }
    }
  };

  const handleMediaView = async () => {
    if (!mediaViewed && (message.message_type === 'image' || message.message_type === 'file')) {
      setMediaViewed(true);
      setIsDestructing(true);
      onMarkMediaAsViewed?.(message.id);
      setTimeout(() => {
        onDelete(message.id, 'both');
      }, 3000); // 3 seconds + animation time
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeliveryStatus = () => {
    if (message.viewed_at) {
      return { icon: CheckCheck, color: 'text-blue-500', status: 'Lida' };
    } else if (message.delivered_at) {
      return { icon: CheckCheck, color: 'text-muted-foreground', status: 'Entregue' };
    } else {
      return { icon: Check, color: 'text-muted-foreground', status: 'Enviada' };
    }
  };

  const renderMediaContent = () => {
    if (message.message_type === 'image') {
      return (
        <div className="max-w-xs" onClick={handleMediaView}>
          <img 
            src={message.file_url} 
            alt={displayText}
            className="rounded-lg max-w-full h-auto cursor-pointer"
          />
          <p className="text-xs mt-2 opacity-70">{displayText}</p>
          {message.single_view && !mediaViewed && (
            <p className="text-xs text-yellow-500">📸 Visualização única</p>
          )}
        </div>
      );
    }

    if (message.message_type === 'audio') {
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMediaPlay}
            className="rounded-full p-2"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full">
              <div className="h-2 bg-primary rounded-full w-1/3"></div>
            </div>
            <p className="text-xs mt-1 opacity-70">Mensagem de áudio</p>
            {message.single_view && !mediaViewed && (
              <p className="text-xs text-yellow-500">🎵 Reprodução única</p>
            )}
          </div>
        </div>
      );
    }

    if (message.message_type === 'file') {
      return (
        <div className="flex items-center gap-3 p-3 border rounded-lg min-w-[200px]" onClick={handleMediaView}>
          <div className="flex-1 cursor-pointer">
            <p className="text-sm font-medium">{displayText}</p>
            <p className="text-xs text-muted-foreground">Arquivo</p>
            {message.single_view && !mediaViewed && (
              <p className="text-xs text-yellow-500">📄 Visualização única</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              window.open(message.file_url, '_blank');
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return null;
  };

  const deliveryStatus = getDeliveryStatus();
  const DeliveryIcon = deliveryStatus.icon;

  return (
    <div className={cn(
      "flex gap-2 max-w-[80%] animate-fade-in",
      isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
    )}>
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback className="text-xs">U</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "relative group",
        !showAvatar && !isOwn && "ml-10"
      )}>
        <SelfDestructAnimation
          isDestructing={isDestructing}
          onComplete={() => onDelete(message.id, 'both')}
          type={message.message_type || 'text'}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  "px-4 py-2 rounded-2xl max-w-md break-words cursor-pointer transition-all duration-200 hover:scale-[1.02] message-content message-secure",
                  isOwn
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto"
                    : "bg-card border border-border",
                  displayText === '*mensagem apagada*' && "opacity-50 italic text-muted-foreground"
                )}
              >
                {message.message_type !== 'text' ? (
                  renderMediaContent()
                ) : (
                  <>
                    <p className="text-sm">{displayText}</p>
                    {showCountdown && (
                      <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(timeLeft)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className={cn(
                    "text-xs opacity-70",
                    isOwn ? "text-blue-100" : "text-muted-foreground"
                  )}>
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                  {isOwn && (
                    <div className={cn("flex items-center gap-1", deliveryStatus.color)} title={deliveryStatus.status}>
                      <DeliveryIcon className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align={isOwn ? "end" : "start"}>
              <DropdownMenuItem onClick={() => onDelete(message.id, 'me')}>
                Apagar para mim
              </DropdownMenuItem>
              {isOwn && (
                <DropdownMenuItem onClick={() => onDelete(message.id, 'both')}>
                  Apagar para todos
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SelfDestructAnimation>
      </div>
    </div>
  );
};
