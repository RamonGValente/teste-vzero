import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  MoreVertical,
  Phone,
  Video,
  UserPlus,
  MessageSquarePlus,
  Users,
  MessageCircle,
  ArrowDown,
  ChevronLeft,
  User,
  Inbox,
  Loader2,
  Lock,
  Clock,
  Play,
  Pause,
  Languages,
  Globe,
  Check,
  ChevronDown,
  X
} from "lucide-react";
import AttentionButton from "@/components/realtime/AttentionButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { MentionText } from "@/components/MentionText";
import { ScrollArea } from "@/components/ui/scroll-area";
import AddFriend from "@/components/AddFriend";
import ContactsList from "@/components/ContactsList";
import FriendRequests from "@/components/FriendRequests";
import CreatePrivateRoom from "@/components/CreatePrivateRoom";
import { MessageInput } from "@/components/MessageInput";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// --- Interfaces ---
interface MessageTimer {
  messageId: string;
  timeLeft: number;
  status: 'counting' | 'deleting' | 'showingUndoing' | 'deleted';
  currentText?: string;
  messageType: 'text' | 'audio' | 'media';
}

interface TranslationState {
  messageId: string;
  originalText: string;
  translatedText: string;
  isTranslated: boolean;
  isLoading: boolean;
  targetLang: string; // Armazena o idioma para o qual foi traduzido
}

interface CustomAudioPlayerProps { 
  audioUrl: string; 
  className?: string;
  onPlay: () => void;
  isOwn: boolean; 
}

// Lista de idiomas disponíveis (EXPANDIDA)
const AVAILABLE_LANGUAGES = [
  { code: 'pt', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en', name: 'Inglês', flag: '🇺🇸' },
  { code: 'es', name: 'Espanhol', flag: '🇪🇸' },
  { code: 'fr', name: 'Francês', flag: '🇫🇷' },
  { code: 'de', name: 'Alemão', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', name: 'Chinês (Simplificado)', flag: '🇨🇳' },
  { code: 'ja', name: 'Japonês', flag: '🇯🇵' },
  { code: 'ko', name: 'Coreano', flag: '🇰🇷' },
  { code: 'ru', name: 'Russo', flag: '🇷🇺' },
  { code: 'ar', name: 'Árabe', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'nl', name: 'Holandês', flag: '🇳🇱' },
  { code: 'sv', name: 'Sueco', flag: '🇸🇪' },
  { code: 'tr', name: 'Turco', flag: '🇹🇷' },
  { code: 'pl', name: 'Polonês', flag: '🇵🇱' },
  { code: 'el', name: 'Grego', flag: '🇬🇷' },
  { code: 'id', name: 'Indonésio', flag: '🇮🇩' },
  { code: 'th', name: 'Tailandês', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamita', flag: '🇻🇳' },
  { code: 'he', name: 'Hebraico', flag: '🇮🇱' },
  { code: 'no', name: 'Norueguês', flag: '🇳🇴' },
  { code: 'da', name: 'Dinamarquês', flag: '🇩🇰' },
  { code: 'fi', name: 'Finlandês', flag: '🇫🇮' },
  { code: 'cs', name: 'Tcheco', flag: '🇨🇿' },
  { code: 'hu', name: 'Húngaro', flag: '🇭🇺' },
];


// --- CustomAudioPlayer Component ---
const CustomAudioPlayer = ({ 
  audioUrl, 
  className,
  onPlay,
  isOwn 
}: CustomAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasTriggeredOnPlay = useRef(false);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        if (!hasTriggeredOnPlay.current) {
          hasTriggeredOnPlay.current = true;
          onPlay();
        }
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(current);
      setDuration(dur);
      const progressValue = (current / dur) * 100;
      setProgress(isNaN(progressValue) ? 0 : progressValue);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setProgress(0);
      setCurrentTime(0);
    }
  };

  const formatTimePlayer = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || isNaN(duration) || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percent * 100);
  };

  const playerClasses = cn(
    "flex items-center gap-3 p-2 rounded-full shadow-lg transition-all duration-200 bg-background border",
    isOwn ? "bg-primary text-primary-foreground" : "bg-card border text-foreground/80",
    className
  );

  const buttonVariant = isOwn ? "secondary" : "primary"; 
  const buttonIconColor = isOwn ? "text-primary" : "text-primary-foreground";
  const progressBg = isOwn ? "bg-white/70" : "bg-primary/60";
  const thumbColor = isOwn ? "bg-secondary" : "bg-primary";
  const timeColorPrimary = isOwn ? "text-primary-foreground/80" : "text-primary";
  const timeColorSecondary = isOwn ? "text-primary-foreground/60" : "text-muted-foreground";

  return (
    <div className={playerClasses}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      >
        <source src={audioUrl} type="audio/webm" />
        <source src={audioUrl} type="audio/mp3" />
        <source src={audioUrl} type="audio/wav" />
      </audio>
      <Button
        variant={buttonVariant}
        size="icon"
        onClick={handlePlayPause}
        className={cn("flex-shrink-0 h-9 w-9 rounded-full hover:bg-opacity-80 transition-colors duration-150", buttonIconColor)}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current translate-x-[1px]" />}
      </Button>
      <div className="flex-1 min-w-0 space-y-1 pr-2">
        <div 
          className="w-full h-5 relative rounded-full overflow-hidden cursor-pointer bg-muted/40"
          onClick={handleSeek}
          title="Clique para buscar"
        >
          <div className={cn("absolute inset-y-0 left-0 transition-all duration-100 ease-linear", progressBg)} style={{ width: `${progress}%` }} />
          <div className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full shadow-md transition-all duration-100 ease-linear", thumbColor)} style={{ left: `calc(${progress}% - 8px)` }} />
        </div>
        <div className="flex justify-between text-xs font-medium opacity-80">
          <span className={timeColorPrimary}>{formatTimePlayer(currentTime)}</span> 
          <span className={timeColorSecondary}>{formatTimePlayer(duration)}</span> 
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal Messages ---
export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"chats" | "contacts">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [messageTimers, setMessageTimers] = useState<MessageTimer[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());
  
  const [translations, setTranslations] = useState<TranslationState[]>([]);
  
  // NOVO ESTADO: Controla a exibição do modal centralizado
  const [modalToTranslate, setModalToTranslate] = useState<{ 
    messageId: string; 
    originalText: string; 
  } | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ====================================================================
  // FUNÇÕES DE TRADUÇÃO (COM SELETOR DE IDIOMA)
  // ====================================================================

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    if (!text || text.trim().length === 0) return text;
    try {
      const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text.substring(0, 2000), 
          targetLang, 
          type: 'translate' 
        })
      });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      if (result.success && result.data && result.data.translatedText) {
        return result.data.translatedText;
      }
      throw new Error('Erro na resposta da API');
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleTranslate = async (messageId: string, text: string, targetLang: string) => {
    
    // Fecha o modal após a seleção, mesmo que o carregamento continue
    setModalToTranslate(null); 

    const existingTranslation = translations.find(t => t.messageId === messageId);

    // Se o usuário clicou em "Ver Original"
    if (targetLang === 'original') {
      if (existingTranslation) {
        setTranslations(prev => prev.map(t => t.messageId === messageId ? { ...t, isTranslated: false } : t));
      }
      return;
    }

    // Se já estiver traduzido para o mesmo idioma, apenas alterna para mostrar
    if (existingTranslation?.translatedText && existingTranslation.targetLang === targetLang) {
       setTranslations(prev => prev.map(t => t.messageId === messageId ? { ...t, isTranslated: true } : t));
       return;
    }

    // Inicia Loading
    setTranslations(prev => {
      const existing = prev.find(t => t.messageId === messageId);
      if (existing) {
         return prev.map(t => t.messageId === messageId ? { ...t, isLoading: true, targetLang, isTranslated: false } : t);
      }
      return [...prev, { 
        messageId, 
        originalText: text, 
        translatedText: '', 
        isTranslated: false, 
        isLoading: true, 
        targetLang 
      }];
    });

    try {
      const translatedText = await translateText(text, targetLang);
      
      setTranslations(prev => prev.map(t => t.messageId === messageId ? { 
          ...t, 
          translatedText, 
          isTranslated: true, 
          isLoading: false,
          targetLang
        } : t
      ));
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível traduzir no momento.", variant: "destructive" });
      setTranslations(prev => prev.filter(t => t.messageId !== messageId));
    }
  };

  const getTranslationState = (messageId: string) => translations.find(t => t.messageId === messageId);


  // Componente de Modal Seletor de Idiomas (dentro de Messages)
  const LanguageSelectorModal = () => {
    if (!modalToTranslate) return null;

    const { messageId, originalText } = modalToTranslate;
    const translationState = getTranslationState(messageId);
    const isLoading = translationState?.isLoading;

    const handleSelectLanguage = (code: string) => {
      handleTranslate(messageId, originalText, code);
    };

    const handleViewOriginal = () => {
       handleTranslate(messageId, originalText, 'original');
       setModalToTranslate(null); // Fecha após a ação
    }

    const handleClose = () => {
      if (!isLoading) setModalToTranslate(null);
    };

    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 p-4"
        onClick={handleClose} // Fecha ao clicar no backdrop
      >
        <div 
          className="bg-card rounded-xl shadow-2xl p-6 w-[90%] max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in-0 duration-300 relative"
          onClick={(e) => e.stopPropagation()} // Impede o fechamento ao clicar no conteúdo
        >
          <div className="flex justify-between items-start mb-4 border-b pb-3">
            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <Globe className="h-5 w-5" /> 
              Escolher Idioma de Tradução
            </h3>
            <Button variant="ghost" size="icon" onClick={handleClose} disabled={isLoading} className="-mr-2"><X className="h-5 w-5 text-muted-foreground hover:text-foreground" /></Button>
          </div>
          
          <div className="text-sm mb-4 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto border text-muted-foreground">
             <span className="font-semibold text-xs text-primary/80 block mb-1">Texto Original:</span>
             {originalText}
          </div>

          {translationState?.isTranslated && translationState.targetLang !== 'original' ? (
            <Button 
              variant="outline"
              className="w-full mb-3 text-red-600 border-red-600/50 hover:bg-red-500/10"
              onClick={handleViewOriginal}
              disabled={isLoading}
            >
              Ver Texto Original
            </Button>
          ) : (
               <p className="text-sm text-muted-foreground mb-3 font-medium">Selecione o idioma para traduzir a mensagem:</p>
          )}
          
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {AVAILABLE_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm border rounded-lg hover:bg-accent/70 transition-colors flex items-center justify-between",
                  translationState?.targetLang === lang.code && translationState.isTranslated
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-background hover:border-primary/50"
                )}
                onClick={() => handleSelectLanguage(lang.code)}
                disabled={isLoading}
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">{lang.flag}</span> {lang.name}
                </span>
                {translationState?.targetLang === lang.code && translationState.isTranslated && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>

          {isLoading && (
             <div className="absolute inset-0 bg-card/70 flex items-center justify-center rounded-xl backdrop-blur-sm">
               <Loader2 className="h-8 w-8 text-primary animate-spin" />
               <span className="text-primary ml-3 font-semibold text-center text-sm px-4">Aguarde... Traduzindo para {AVAILABLE_LANGUAGES.find(l => l.code === translationState?.targetLang)?.name || '...'}</span>
             </div>
          )}
        </div>
      </div>
    );
  };
  // ====================================================================
  
  // ... (funções de utilidade e hooks)
  
  const scrollToBottom = useCallback((instant: boolean = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: instant ? "auto" : "smooth",
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setIsAtBottom(Math.abs(scrollHeight - scrollTop - clientHeight) <= 50);
    setShowScrollButton(Math.abs(scrollHeight - scrollTop - clientHeight) > 50);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("friend_code").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: rawConversations, refetch: refetchConversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations")
        .select(`*, conversation_participants!inner(user_id, profiles(username, avatar_url)), messages(id, content, created_at, media_urls, user_id)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const processedConversations = useMemo(() => {
    if (!rawConversations || !user) return [];
    const uniqueMap = new Map();
    rawConversations.forEach((conv) => {
      const lastMsgDate = conv.messages?.[0]?.created_at 
        ? new Date(conv.messages[0].created_at).getTime() 
        : new Date(conv.created_at).getTime();
      const convWithDate = { ...conv, sortTime: lastMsgDate };
      if (conv.is_group) {
        uniqueMap.set(conv.id, convWithDate);
      } else {
        const otherParticipant = conv.conversation_participants.find((p: any) => p.user_id !== user.id);
        if (otherParticipant?.user_id) {
          const existing = uniqueMap.get(otherParticipant.user_id);
          if (!existing || lastMsgDate > existing.sortTime) {
            uniqueMap.set(otherParticipant.user_id, convWithDate);
          }
        }
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => b.sortTime - a.sortTime);
  }, [rawConversations, user]);

  const { data: messages, refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", selectedConversation],
    enabled: !!selectedConversation,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages")
        .select(`*, profiles:user_id(username, avatar_url)`)
        .eq("conversation_id", selectedConversation)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getMessageType = useCallback((msg: any): 'text' | 'audio' | 'media' => {
    if (msg.content) return 'text';
    if (msg.media_urls && msg.media_urls.some((url: string) => 
      url.includes(".webm") || url.includes("audio") || url.includes(".mp3") || url.includes(".wav")
    )) return 'audio';
    return 'media';
  }, []);

  const startAudioTimer = useCallback((messageId: string) => {
    setMessageTimers(prev => {
      if (prev.find(timer => timer.messageId === messageId)) return prev;
      return [...prev, { messageId, timeLeft: 120, status: 'counting', messageType: 'audio' }];
    });
  }, []);

  useEffect(() => {
    if (!messages || !user) return;
    messages.forEach(message => {
      if (message.user_id !== user.id && !deletedMessages.has(message.id)) {
        const messageType = getMessageType(message);
        const existingTimer = messageTimers.find(timer => timer.messageId === message.id);
        if (existingTimer) return;
        if (messageType === 'text' || messageType === 'media') {
          setMessageTimers(prev => [...prev, { messageId: message.id, timeLeft: 120, status: 'counting', messageType }]);
        }
      }
    });
  }, [messages, user, deletedMessages, messageTimers, getMessageType]);

  const deleteMessages = async (messageIds: string[]) => {
    try {
      await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: null, media_urls: null }).in('id', messageIds);
      setDeletedMessages(prev => {
        const newSet = new Set(prev);
        messageIds.forEach(id => newSet.add(id));
        return newSet;
      });
      refetchMessages();
      refetchConversations();
    } catch (error) {
      console.error('Erro ao excluir mensagens:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageTimers(prev => {
        const updatedTimers: MessageTimer[] = [];
        const messagesToDelete: string[] = [];
        prev.forEach(timer => {
          if (timer.timeLeft <= 1) {
            switch (timer.status) {
              case 'counting':
                if (timer.messageType === 'text') {
                  updatedTimers.push({
                    ...timer,
                    status: 'deleting',
                    currentText: messages?.find(m => m.id === timer.messageId)?.content || '',
                    timeLeft: 120
                  });
                } else {
                  updatedTimers.push({ ...timer, status: 'showingUndoing', timeLeft: 5 });
                }
                break;
              case 'deleting':
                updatedTimers.push({ ...timer, status: 'showingUndoing', timeLeft: 5, currentText: undefined });
                break;
              case 'showingUndoing':
                messagesToDelete.push(timer.messageId);
                updatedTimers.push({ ...timer, status: 'deleted' });
                break;
              default:
                updatedTimers.push(timer);
            }
          } else {
            if (timer.status === 'deleting' && timer.currentText) {
              const originalText = messages?.find(m => m.id === timer.messageId)?.content || '';
              const elapsedTime = 120 - timer.timeLeft + 1;
              const lettersToKeep = Math.max(0, Math.floor(originalText.length * (1 - (elapsedTime / 120))));
              updatedTimers.push({ ...timer, timeLeft: timer.timeLeft - 1, currentText: originalText.slice(0, lettersToKeep) });
            } else {
              updatedTimers.push({ ...timer, timeLeft: timer.timeLeft - 1 });
            }
          }
        });
        if (messagesToDelete.length > 0) deleteMessages(messagesToDelete);
        return updatedTimers;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [messages]);

  const getMessageState = (messageId: string) => messageTimers.find(timer => timer.messageId === messageId);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("global-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => { refetchMessages(); refetchConversations(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => { refetchConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchMessages, refetchConversations, user]);

  useEffect(() => {
    if (user && selectedConversation) {
      supabase.from("last_viewed").upsert(
        { user_id: user.id, section: "messages", viewed_at: new Date().toISOString() },
        { onConflict: "user_id,section" }
      ).then(() => queryClient.invalidateQueries({ queryKey: ["unread-messages"] }));
    }
  }, [user, selectedConversation, queryClient]);

  useEffect(() => { if (messages && isAtBottom) setTimeout(() => scrollToBottom(false), 100); }, [messages, isAtBottom, scrollToBottom]);
  useEffect(() => { if (selectedConversation) setTimeout(() => scrollToBottom(true), 100); }, [selectedConversation, scrollToBottom]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !selectedConversation || !user) return;
    const { data: msg } = await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, content: text }).select().single();
    if (msg) {
      const { saveMentions } = await import("@/utils/mentionsHelper");
      await saveMentions(msg.id, "message", text, user.id);
      refetchMessages();
      scrollToBottom(true);
    }
  };

  const handleMediaUpload = async (files: File[]) => {
    if (!selectedConversation || !user) return;
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(filePath);
        return publicUrl;
      });
      const urls = await Promise.all(uploadPromises);
      await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, media_urls: urls });
      refetchMessages();
      scrollToBottom(true);
    } catch (e) {
      toast({ title: "Erro no envio", variant: "destructive" });
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    if (!selectedConversation || !user) return;
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${user.id}/${fileName}`;
      const { error } = await supabase.storage.from("media").upload(filePath, blob);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(filePath);
      await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, media_urls: [publicUrl] });
      refetchMessages();
      scrollToBottom(true);
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const startChatWithFriend = async (friendId: string) => {
    if (!user) return;
    const existingLocal = processedConversations.find(c => !c.is_group && c.conversation_participants.some((p: any) => p.user_id === friendId));
    if (existingLocal) {
      setSelectedConversation(existingLocal.id);
      setSidebarTab("chats");
      return;
    }
    try {
      const { data: newConv } = await supabase.from("conversations").insert({ is_group: false }).select().single();
      if (newConv) {
        await supabase.from("conversation_participants").insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: friendId }
        ]);
        await refetchConversations();
        setSelectedConversation(newConv.id);
        setSidebarTab("chats");
      }
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const filteredConversations = processedConversations.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.conversation_participants.some((p: any) => p.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const showSidebar = !isMobile || (isMobile && !selectedConversation);
  const showChat = !isMobile || (isMobile && selectedConversation);

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen bg-background overflow-hidden relative">
      
      {/* MODAL SELETOR DE IDIOMAS */}
      <LanguageSelectorModal />

      {/* SIDEBAR */}
      <div className={cn("flex flex-col bg-card border-r transition-all duration-300", showSidebar ? "w-full lg:w-[380px]" : "hidden lg:flex lg:w-[380px]")}>
        <div className="p-4 border-b space-y-4 bg-gradient-to-r from-background to-muted/20">
          <div className="relative flex items-center justify-center min-h-[28px]">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Mensagens
            </h2>
            <div className="absolute right-0"><CreatePrivateRoom /></div>
          </div>
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="chats">Conversas</TabsTrigger>
              <TabsTrigger value="contacts">Contatos</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={sidebarTab === "chats" ? "Buscar conversas..." : "Buscar contatos..."} className="pl-9 bg-background/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {sidebarTab === "chats" ? (
            <ScrollArea className="h-full">
              {isLoadingConversations ? (
                 <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...</div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                <div className="flex flex-col">
                  {filteredConversations.map((conv) => {
                    const otherParticipant = conv.conversation_participants.find((p:any) => p.user_id !== user?.id);
                    const lastMessage = conv.messages?.[0];
                    const isActive = selectedConversation === conv.id;
                    return (
                      <button key={conv.id} onClick={() => setSelectedConversation(conv.id)} className={cn("flex items-center gap-3 p-4 border-b border-muted/40 hover:bg-accent/40 transition-all text-left w-full", isActive && "bg-accent/60 border-l-4 border-l-primary pl-[13px]")}>
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-background">
                            <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                            <AvatarFallback className="bg-muted font-semibold">{conv.is_group ? <Users className="h-4 w-4" /> : otherParticipant?.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold truncate text-sm">{conv.name || otherParticipant?.profiles?.username || "Sala Privada"}</span>
                            {lastMessage && <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{new Date(lastMessage.created_at).toLocaleDateString() === new Date().toLocaleDateString() ? new Date(lastMessage.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(lastMessage.created_at).toLocaleDateString()}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{lastMessage?.content ? (lastMessage.user_id === user?.id ? "Você: " : "") + lastMessage.content : (lastMessage?.media_urls ? "📷 Mídia enviada" : "Toque para conversar")}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground opacity-70">
                  <Inbox className="h-12 w-12 mb-2 opacity-20" />
                  <p>Nenhuma conversa encontrada.</p>
                  <Button variant="link" onClick={() => setSidebarTab("contacts")}>Iniciar nova conversa</Button>
                </div>
              )}
            </ScrollArea>
          ) : (
            <Tabs defaultValue="list" className="h-full flex flex-col">
               <div className="px-4 pb-2 bg-card border-b">
                 <TabsList className="w-full h-9 bg-muted/40">
                    <TabsTrigger value="list" className="text-xs flex-1">Meus Amigos</TabsTrigger>
                    <TabsTrigger value="requests" className="text-xs flex-1">Pedidos</TabsTrigger>
                    <TabsTrigger value="add" className="text-xs flex-1">Adicionar</TabsTrigger>
                 </TabsList>
               </div>
               <ScrollArea className="flex-1 bg-muted/10">
                 <TabsContent value="list" className="m-0 p-0"><ContactsList onStartChat={startChatWithFriend} /></TabsContent>
                 <TabsContent value="requests" className="m-0 p-4"><FriendRequests /></TabsContent>
                 <TabsContent value="add" className="m-0 p-4">
                    <div className="bg-card p-4 rounded-lg border shadow-sm">
                       <div className="flex items-center gap-2 mb-4 text-primary"><UserPlus className="h-5 w-5" /><h3 className="font-semibold">Adicionar novo amigo</h3></div>
                       <AddFriend userCode={profile?.friend_code} />
                    </div>
                 </TabsContent>
               </ScrollArea>
            </Tabs>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div className={cn("flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 relative", showChat ? "flex" : "hidden")}>
        {selectedConversation ? (
          <>
            <div className="h-16 border-b flex items-center justify-between px-4 bg-card/80 backdrop-blur-md z-10 shadow-sm">
              <div className="flex items-center gap-3">
                {isMobile && <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setSelectedConversation(null)}><ChevronLeft className="h-6 w-6" /></Button>}
                {(() => {
                   const conv = processedConversations.find(c => c.id === selectedConversation) || rawConversations?.find(c => c.id === selectedConversation);
                   const peer = conv?.conversation_participants.find((p:any) => p.user_id !== user?.id);
                   return (
                     <>
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={peer?.profiles?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">{peer?.profiles?.username?.[0]?.toUpperCase() || <User />}</AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <h3 className="font-semibold flex items-center gap-2">{conv?.name || peer?.profiles?.username || "Chat"}{peer?.user_id && <UserLink userId={peer.user_id} username={peer.profiles?.username || ""} className="opacity-0 w-0 h-0 overflow-hidden" />}</h3>
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1"><span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse" />Online</p>
                      </div>
                     </>
                   );
                })()}
              </div>
              <div className="flex items-center gap-1">
                 {(() => {
                    const conv = rawConversations?.find(c => c.id === selectedConversation);
                    const peerId = conv?.conversation_participants.find((p:any) => p.user_id !== user?.id)?.user_id;
                    return peerId ? <AttentionButton contactId={peerId} /> : null;
                 })()}
                <div className="hidden sm:flex">
                   <Button variant="ghost" size="icon" title="Chamada de Voz"><Phone className="h-4 w-4" /></Button>
                   <Button variant="ghost" size="icon" title="Chamada de Vídeo"><Video className="h-4 w-4" /></Button>
                </div>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar overflow-x-hidden">
              {!isLoadingMessages && messages?.map((msg, idx) => {
                const isOwn = msg.user_id === user?.id;
                const showAvatar = !isOwn && (idx === 0 || messages[idx-1].user_id !== msg.user_id);
                const timerState = getMessageState(msg.id);
                const messageType = getMessageType(msg);
                const translationState = getTranslationState(msg.id);

                if (timerState?.status === 'deleted' || deletedMessages.has(msg.id)) return null;

                let displayText = msg.content;
                if (timerState?.status === 'deleting' && timerState.currentText) {
                  displayText = timerState.currentText;
                } else if (translationState?.isTranslated && translationState.targetLang !== 'original') {
                  displayText = translationState.translatedText;
                }

                return (
                  <div key={msg.id} className={cn("flex w-full gap-2", isOwn ? "justify-end" : "justify-start")}>
                    {!isOwn && (
                      <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                        {showAvatar ? <Avatar className="h-8 w-8"><AvatarImage src={msg.profiles?.avatar_url} /><AvatarFallback className="text-[10px]">{msg.profiles?.username?.[0]}</AvatarFallback></Avatar> : <div className="w-8" />}
                      </div>
                    )}

                    <div className={cn("flex flex-col max-w-[85%] sm:max-w-[70%] min-w-0", isOwn ? "items-end" : "items-start")}>
                      
                      {timerState && timerState.status !== 'deleted' && (
                        <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {timerState.status === 'counting' && formatTime(timerState.timeLeft)}
                            {timerState.status === 'deleting' && `Apagando... ${formatTime(timerState.timeLeft)}`}
                            {timerState.status === 'showingUndoing' && `${timerState.timeLeft}s`}
                          </span>
                        </div>
                      )}

                      {!isOwn && messageType === 'audio' && !timerState && (
                        <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Reproduza o áudio para iniciar o timer</span>
                        </div>
                      )}

                      {timerState?.status === 'showingUndoing' && (
                        <div className="px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg mb-2 animate-pulse"><span className="text-destructive font-mono font-bold tracking-wider">UnDoInG</span></div>
                      )}

                      {msg.media_urls && msg.media_urls.length > 0 && timerState?.status !== 'showingUndoing' && (
                        <div className="mb-1 space-y-1 max-w-full">
                          {msg.media_urls.map((url: string, i: number) => {
                            if (messageType === 'audio') {
                              return (
                                <div key={i} className="max-w-full">
                                  <CustomAudioPlayer 
                                    audioUrl={url} 
                                    isOwn={isOwn} 
                                    className={cn(isOwn ? "max-w-[250px] w-full" : "max-w-[300px] w-full")} 
                                    onPlay={() => { if (!isOwn) startAudioTimer(msg.id); }}
                                  />
                                </div>
                              );
                            }
                            return <img key={i} src={url} alt="midia" className="rounded-lg max-h-[300px] max-w-full border shadow-sm w-auto object-cover bg-black/10" />;
                          })}
                        </div>
                      )}

                      {msg.content && timerState?.status !== 'showingUndoing' && (
                        <div className={cn("px-4 py-2 shadow-md text-sm relative group break-words min-w-[60px] max-w-full", isOwn ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm" : "bg-card border text-foreground rounded-2xl rounded-tl-sm")}>
                          <div className="break-words overflow-hidden"><MentionText text={displayText} /></div>
                          
                          {/* BOTÃO DE TRADUÇÃO - Agora abre o Modal */}
                          {!isOwn && msg.content && (
                            <div className="flex justify-between items-center mt-2 border-t border-foreground/5 pt-1 relative">
                              
                              {/* Informação de hora e idioma traduzido */}
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[10px] opacity-60", isOwn ? "text-primary-foreground" : "text-muted-foreground")}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {translationState?.isTranslated && translationState.targetLang !== 'original' && (
                                   <span className="text-[9px] italic opacity-70 flex items-center gap-1 text-muted-foreground font-medium">
                                     <Globe className="h-2 w-2"/> 
                                     {AVAILABLE_LANGUAGES.find(l => l.code === translationState.targetLang)?.flag || '🌐'} 
                                     {AVAILABLE_LANGUAGES.find(l => l.code === translationState.targetLang)?.name.split(' ')[0].toUpperCase()}
                                   </span>
                                )}
                              </div>
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn("h-6 px-2 text-[10px] opacity-60 hover:opacity-100 transition-all flex items-center gap-1", translationState?.isLoading && "opacity-100")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalToTranslate({ messageId: msg.id, originalText: msg.content });
                                }}
                                disabled={translationState?.isLoading}
                              >
                                {translationState?.isLoading ? (
                                  <><Loader2 className="h-3 w-3 animate-spin mr-1" />Traduzindo...</>
                                ) : (
                                  <>
                                    <Globe className="h-3 w-3 mr-1" /> 
                                    {translationState?.isTranslated ? "Ver Tradução" : "Traduzir"}
                                    <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                                  </>
                                )}
                              </Button>

                            </div>
                          )}

                          {isOwn && <span className="text-[10px] opacity-60 block text-right mt-1">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {showScrollButton && <Button size="icon" className="absolute bottom-24 right-6 rounded-full shadow-xl z-20 animate-in fade-in zoom-in duration-300" onClick={() => scrollToBottom(false)}><ArrowDown className="h-5 w-5" /></Button>}

            <div className="p-4 bg-background border-t">
               <div className="max-w-4xl mx-auto w-full">
                 <MessageInput onSendMessage={handleSendMessage} onAudioReady={handleAudioUpload} onMediaReady={handleMediaUpload} disabled={!selectedConversation} />
               </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
             <div className="w-32 h-32 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-6 animate-pulse"><MessageSquarePlus className="h-16 w-16 text-primary" /></div>
             <h1 className="text-3xl font-bold tracking-tight mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Suas Mensagens</h1>
             <p className="text-muted-foreground max-w-md mb-8 text-lg">Selecione uma conversa na barra lateral ou inicie um novo chat com seus amigos.</p>
             {!isMobile && <div className="flex gap-4 text-sm text-muted-foreground/60"><span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Criptografado de ponta a ponta</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}