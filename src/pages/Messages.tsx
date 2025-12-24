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
  X,
  ArrowRight,
  Volume2,
  VolumeX
} from "lucide-react";
import AttentionButton from "@/components/realtime/AttentionButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { MovementStatusBadge } from "@/components/movement/MovementStatusBadge";
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
import { useSearchParams } from "react-router-dom";
import { sendPushEvent } from "@/utils/pushClient";

// --- Interfaces ---
interface MessageTimer {
  messageId: string;
  timeLeft: number;
  expiryTime: number; 
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
  targetLang: string;
  sourceLang?: string;
}

interface CustomAudioPlayerProps { 
  audioUrl: string; 
  className?: string;
  onPlay: () => void;
  isOwn: boolean; 
}

interface SpeechState {
  messageId: string;
  isSpeaking: boolean;
}

interface AttentionCallRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  created_at: string;
}

// Lista de idiomas disponíveis
const AVAILABLE_LANGUAGES = [
  { code: 'pt', name: 'Português (BR)', flag: '🇧🇷', nativeName: 'Português', speechLang: 'pt-BR' },
  { code: 'en', name: 'Inglês', flag: '🇺🇸', nativeName: 'English', speechLang: 'en-US' },
  { code: 'es', name: 'Espanhol', flag: '🇪🇸', nativeName: 'Español', speechLang: 'es-ES' },
  { code: 'fr', name: 'Francês', flag: '🇫🇷', nativeName: 'Français', speechLang: 'fr-FR' },
  { code: 'de', name: 'Alemão', flag: '🇩🇪', nativeName: 'Deutsch', speechLang: 'de-DE' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', nativeName: 'Italiano', speechLang: 'it-IT' },
  { code: 'ja', name: 'Japonês', flag: '🇯🇵', nativeName: '日本語', speechLang: 'ja-JP' },
  { code: 'ko', name: 'Coreano', flag: '🇰🇷', nativeName: '한국어', speechLang: 'ko-KR' },
  { code: 'zh', name: 'Chinês', flag: '🇨🇳', nativeName: '中文', speechLang: 'zh-CN' },
  { code: 'ru', name: 'Russo', flag: '🇷🇺', nativeName: 'Русский', speechLang: 'ru-RU' },
  { code: 'ar', name: 'Árabe', flag: '🇸🇦', nativeName: 'العربية', speechLang: 'ar-SA' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी', speechLang: 'hi-IN' },
];

// Funções auxiliares para idiomas...
const getLanguageName = (code: string): string => {
  const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code.toUpperCase();
};

const getLanguageNativeName = (code: string): string => {
  const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
  return lang ? lang.nativeName : code.toUpperCase();
};

const getSpeechLang = (code: string): string => {
  const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
  return lang ? lang.speechLang : 'pt-BR';
};

// --- Componente do Menu de Idiomas ---
const LanguageMenuModal = ({ 
  messageId, 
  originalText, 
  currentTranslation, 
  onTranslate,
  onClose 
}: {
  messageId: string;
  originalText: string;
  currentTranslation?: TranslationState;
  onTranslate: (messageId: string, text: string, targetLang: string) => void;
  onClose: () => void;
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'popular' | 'all'>('popular');
  
  const popularLanguages = AVAILABLE_LANGUAGES.filter(lang => 
    ['pt', 'en', 'es', 'fr', 'de', 'it'].includes(lang.code)
  );

  const handleLanguageSelect = (targetLang: string) => {
    onTranslate(messageId, originalText, targetLang);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-popover border shadow-2xl rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Traduzir mensagem</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 pt-3 flex-shrink-0">
          <Tabs value={selectedCategory} onValueChange={(v: any) => setSelectedCategory(v)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="popular" className="text-sm">Populares</TabsTrigger>
              <TabsTrigger value="all" className="text-sm">Todos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-1 pb-2">
            {currentTranslation?.isTranslated && (
              <button
                className="w-full text-left px-3 py-3 text-sm hover:bg-accent hover:text-accent-foreground rounded-md flex items-center gap-3 font-medium text-primary border border-primary/20 mb-2"
                onClick={() => handleLanguageSelect('original')}
              >
                <X className="h-4 w-4" />
                <div className="flex-1">
                  <div>Ver Original</div>
                  <div className="text-xs text-muted-foreground">{getLanguageNativeName(currentTranslation.sourceLang || 'auto')}</div>
                </div>
                <Check className="h-4 w-4 text-primary" />
              </button>
            )}

            {(selectedCategory === 'popular' ? popularLanguages : AVAILABLE_LANGUAGES).map((lang) => (
              <button
                key={lang.code}
                className={cn(
                  "w-full text-left px-3 py-3 text-sm hover:bg-accent hover:text-accent-foreground rounded-md flex items-center gap-3 transition-colors",
                  currentTranslation?.targetLang === lang.code && currentTranslation.isTranslated && "bg-accent/50"
                )}
                onClick={() => handleLanguageSelect(lang.code)}
              >
                <span className="text-base">{lang.flag}</span>
                <div className="flex-1 flex flex-col items-start">
                  <span className="font-medium">{lang.name}</span>
                  <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
                </div>
                {currentTranslation?.targetLang === lang.code && currentTranslation.isTranslated && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t bg-muted/10 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Globe className="h-3 w-3" />
            <span>Tradução automática</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CustomAudioPlayer Component ---
const CustomAudioPlayer = ({ audioUrl, className, onPlay, isOwn }: CustomAudioPlayerProps) => {
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
          onPlay(); // Dispara o início do timer apenas no primeiro Play
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

  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-full shadow-lg transition-all duration-200 border", isOwn ? "bg-primary text-primary-foreground" : "bg-card border text-foreground/80", className)}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      >
        <source src={audioUrl} />
      </audio>
      <Button
        variant={isOwn ? "secondary" : "default"}
        size="icon"
        onClick={handlePlayPause}
        className={cn("flex-shrink-0 h-9 w-9 rounded-full hover:bg-opacity-80 transition-colors duration-150", isOwn ? "text-primary" : "text-primary-foreground")}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current translate-x-[1px]" />}
      </Button>
      <div className="flex-1 min-w-0 space-y-1 pr-2">
        <div className="w-full h-5 relative rounded-full overflow-hidden cursor-pointer bg-muted/40" onClick={handleSeek}>
          <div className={cn("absolute inset-y-0 left-0 transition-all duration-100 ease-linear", isOwn ? "bg-white/70" : "bg-primary/60")} style={{ width: `${progress}%` }} />
          <div className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full shadow-md transition-all duration-100 ease-linear", isOwn ? "bg-secondary" : "bg-primary")} style={{ left: `calc(${progress}% - 8px)` }} />
        </div>
        <div className="flex justify-between text-xs font-medium opacity-80">
          <span className={isOwn ? "text-primary-foreground/80" : "text-primary"}>{formatTimePlayer(currentTime)}</span> 
          <span className={isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}>{formatTimePlayer(duration)}</span> 
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
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const conv = searchParams.get('conversation');
    const tab = searchParams.get('tab') as any;
    if (tab === 'contacts' || tab === 'chats') setSidebarTab(tab);
    if (conv) setSelectedConversation(conv);
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [messageTimers, setMessageTimers] = useState<MessageTimer[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());
  
  const [translations, setTranslations] = useState<TranslationState[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [speechStates, setSpeechStates] = useState<SpeechState[]>([]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- TTS Functions ---
  const speakText = useCallback((text: string, messageId: string, targetLang: string = 'pt') => {
    const synth = window.speechSynthesis || (window as any).webkitSpeechSynthesis;
    if (!synth) {
      toast({ title: "Erro", description: "Seu navegador não suporta leitura de voz.", variant: "destructive" });
      return;
    }

    try {
      synth.cancel();
      setSpeechStates(prev => {
        const others = prev.filter(s => s.messageId !== messageId).map(s => ({ ...s, isSpeaking: false }));
        return [...others, { messageId, isSpeaking: true }];
      });

      const utterance = new SpeechSynthesisUtterance(text);
      const speechLang = getSpeechLang(targetLang);
      utterance.lang = speechLang;
      utterance.rate = 0.9;

      const voices = synth.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(v => v.lang === speechLang);
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      utterance.onend = () => setSpeechStates(prev => prev.map(s => s.messageId === messageId ? { ...s, isSpeaking: false } : s));
      utterance.onerror = () => setSpeechStates(prev => prev.map(s => s.messageId === messageId ? { ...s, isSpeaking: false } : s));

      synth.speak(utterance);
    } catch (error) {
      console.error("TTS Error:", error);
      setSpeechStates(prev => prev.map(s => s.messageId === messageId ? { ...s, isSpeaking: false } : s));
    }
  }, [toast]);

  const stopSpeech = useCallback((messageId?: string) => {
    const synth = window.speechSynthesis || (window as any).webkitSpeechSynthesis;
    if (messageId) {
      setSpeechStates(prev => prev.map(s => s.messageId === messageId ? { ...s, isSpeaking: false } : s));
    } else {
      setSpeechStates(prev => prev.map(s => ({ ...s, isSpeaking: false })));
    }
    if (synth) synth.cancel();
  }, []);

  useEffect(() => {
    return () => {
      const synth = window.speechSynthesis || (window as any).webkitSpeechSynthesis;
      if (synth) synth.cancel();
    };
  }, []);

  const getSpeechState = (messageId: string) => speechStates.find(s => s.messageId === messageId);

  // --- TRANSLATION LOGIC (UPDATED FOR LARGE TEXTS) ---
  const callTranslateApi = async (textChunk: string, targetLang: string): Promise<string> => {
    const response = await fetch('/.netlify/functions/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textChunk, targetLang, type: 'translate' })
    });
    if (!response.ok) throw new Error('API Error');
    const result = await response.json();
    return result.data?.translatedText || textChunk;
  };

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    if (!text?.trim()) return text;
    
    // Limite seguro para evitar erro de payload ou timeout da API (300 a 400 chars é um bom padrão)
    const CHUNK_SIZE = 350;

    // Se for pequeno, chama direto
    if (text.length <= CHUNK_SIZE) {
        return await callTranslateApi(text, targetLang);
    }

    // Se for grande, quebra em pedaços respeitando frases
    const chunks: string[] = [];
    let currentChunk = "";
    
    // Divide por pontuação mantendo a pontuação
    const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];

    sentences.forEach(sentence => {
        if ((currentChunk + sentence).length > CHUNK_SIZE && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }
        currentChunk += sentence;
    });
    if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());

    try {
        // Traduz pedaços em paralelo
        const promises = chunks.map(chunk => callTranslateApi(chunk, targetLang));
        const results = await Promise.all(promises);
        return results.join(" ");
    } catch (error) {
        console.error('Erro na tradução em lote:', error);
        throw error;
    }
  };

  const handleTranslate = async (messageId: string, text: string, targetLang: string) => {
    setOpenMenuId(null);
    const existingTranslation = translations.find(t => t.messageId === messageId);

    if (targetLang === 'original') {
      if (existingTranslation) setTranslations(prev => prev.map(t => t.messageId === messageId ? { ...t, isTranslated: false } : t));
      return;
    }

    if (existingTranslation?.translatedText && existingTranslation.targetLang === targetLang) {
      setTranslations(prev => prev.map(t => t.messageId === messageId ? { ...t, isTranslated: !t.isTranslated } : t));
      return;
    }

    setTranslations(prev => {
      const existing = prev.find(t => t.messageId === messageId);
      if (existing) return prev.map(t => t.messageId === messageId ? { ...t, isLoading: true, targetLang, isTranslated: false } : t);
      return [...prev, { messageId, originalText: text, translatedText: '', isTranslated: false, isLoading: true, targetLang }];
    });

    try {
      const translatedText = await translateText(text, targetLang);
      setTranslations(prev => prev.map(t => t.messageId === messageId ? { ...t, translatedText, isTranslated: true, isLoading: false, targetLang, sourceLang: 'auto' } : t));
    } catch (error) {
      toast({ title: "Erro na tradução", description: "Texto muito longo ou erro de conexão.", variant: "destructive" });
      setTranslations(prev => prev.map(t => t.messageId === messageId ? { ...t, isLoading: false, isTranslated: false } : t));
    }
  };

  const getTranslationState = (messageId: string) => translations.find(t => t.messageId === messageId);
  const getSelectedMessageText = () => messages?.find(m => m.id === openMenuId)?.content || '';

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // --- Scroll Logic ---
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

  // --- Queries ---
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("friend_code").eq("id", user!.id).single();
      return data;
    },
  });

  // CORREÇÃO AQUI: Filtrar conversas apenas do usuário atual
  const { data: rawConversations, refetch: refetchConversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Primeiro, obter IDs das conversas onde o usuário atual é participante
      const { data: participantData, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user!.id);

      if (participantError) throw participantError;
      
      if (!participantData || participantData.length === 0) {
        return [];
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Buscar conversas apenas onde o usuário é participante
      const { data, error } = await supabase.from("conversations")
        .select(`*, conversation_participants!inner(user_id, profiles(username, avatar_url)), messages(id, content, created_at, media_urls, user_id, deleted_at)`)
        .in("id", conversationIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Função para verificar se uma conversa tem mensagens válidas
  const hasValidMessages = useCallback((conv: any) => {
    if (!conv.messages || conv.messages.length === 0) return false;
    
    // Verifica se há pelo menos uma mensagem não deletada
    const validMessages = conv.messages.filter((msg: any) => 
      msg.deleted_at === null && 
      (msg.content !== null || (msg.media_urls && msg.media_urls.length > 0))
    );
    
    return validMessages.length > 0;
  }, []);

  const processedConversations = useMemo(() => {
    if (!rawConversations || !user) return [];
    
    const uniqueMap = new Map();
    
    rawConversations.forEach((conv) => {
      // Filtra apenas conversas que têm mensagens válidas
      if (!hasValidMessages(conv)) return;
      
      const lastMsgDate = conv.messages?.[0]?.created_at 
        ? new Date(conv.messages[0].created_at).getTime() 
        : new Date(conv.created_at).getTime();
      
      const convWithDate = { 
        ...conv, 
        sortTime: lastMsgDate,
        // Adiciona contador de mensagens não visualizadas
        unreadCount: conv.messages?.filter((msg: any) => 
          msg.user_id !== user.id && 
          msg.viewed_at === null &&
          msg.deleted_at === null
        ).length || 0
      };
      
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
    
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.sortTime - a.sortTime);
  }, [rawConversations, user, hasValidMessages]);

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

  // Dados da conversa selecionada (para chats privados)
  const selectedConvData = useMemo(() => {
    if (!selectedConversation || !rawConversations) return null;
    return rawConversations.find(c => c.id === selectedConversation) || null;
  }, [rawConversations, selectedConversation]);

  const privatePeer = useMemo(() => {
    if (!selectedConvData || !user || selectedConvData.is_group) return null;
    return selectedConvData.conversation_participants?.find((p: any) => p.user_id !== user.id) || null;
  }, [selectedConvData, user]);

  const privatePeerId = (privatePeer?.user_id as string | undefined) ?? null;
  const privatePeerProfile = privatePeer?.profiles ?? null;
  const isPrivateChat = !!privatePeerId && !selectedConvData?.is_group;

  // Para renderizar "bolha" de Chamar Atenção dentro do chat
  const { data: attentionCalls, refetch: refetchAttentionCalls } = useQuery({
    queryKey: ["attention_calls_in_chat", selectedConversation, user?.id, privatePeerId],
    enabled: !!selectedConversation && !!user?.id && !!privatePeerId && isPrivateChat,
    queryFn: async () => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
      const { data, error } = await supabase
        .from("attention_calls")
        .select("id,sender_id,receiver_id,message,created_at")
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${privatePeerId}),and(sender_id.eq.${privatePeerId},receiver_id.eq.${user!.id})`
        )
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as AttentionCallRow[];
    },
  });

  useEffect(() => {
    if (!user || !privatePeerId || !selectedConversation) return;
    if (!isPrivateChat) return;
    const channel = supabase
      .channel(`attention-calls-chat-${selectedConversation}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attention_calls" },
        (payload) => {
          const row = payload.new as any;
          const matches =
            (row.sender_id === user.id && row.receiver_id === privatePeerId) ||
            (row.sender_id === privatePeerId && row.receiver_id === user.id);
          if (!matches) return;
          refetchAttentionCalls();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, privatePeerId, selectedConversation, isPrivateChat, refetchAttentionCalls]);

  const getMessageType = useCallback((msg: any): 'text' | 'audio' | 'media' => {
    if (msg.content) return 'text';
    if (msg.media_urls && msg.media_urls.some((url: string) => 
      url.includes(".webm") || url.includes("audio") || url.includes(".mp3") || url.includes(".wav")
    )) return 'audio';
    return 'media';
  }, []);

  // ====================================================================
  // LOGICA DO TIMER (Mantida versão LocalStorage/Visualização)
  // ====================================================================

  // Inicia timer de audio MANUALMENTE (ao dar play)
  const startAudioTimer = useCallback((messageId: string) => {
    setMessageTimers(prev => {
      if (prev.find(timer => timer.messageId === messageId)) return prev;

      // Define expiração para 2 minutos a partir de AGORA (momento do Play)
      const now = Date.now();
      const expiryTime = now + 120000; // 120 segundos

      const storageKey = `timer_${user?.id}_${messageId}`;
      localStorage.setItem(storageKey, expiryTime.toString());

      return [...prev, { 
        messageId, 
        timeLeft: 120, 
        expiryTime: expiryTime,
        status: 'counting', 
        messageType: 'audio' 
      }];
    });
  }, [user]);

  // Gerencia inicialização e contagem dos timers
  useEffect(() => {
    if (!messages || !user) return;
    
    setMessageTimers(prev => {
      const now = Date.now();
      const newTimers: MessageTimer[] = [];
      const currentTimerIds = new Set(prev.map(t => t.messageId));
      
      messages.forEach(message => {
        if (message.user_id === user.id || deletedMessages.has(message.id) || currentTimerIds.has(message.id)) return;
        
        const messageType = getMessageType(message);
        const storageKey = `timer_${user.id}_${message.id}`;
        const storedExpiry = localStorage.getItem(storageKey);

        let expiryTime = 0;

        if (storedExpiry) {
           expiryTime = parseInt(storedExpiry, 10);
        } else {
           if (messageType === 'text' || messageType === 'media') {
             expiryTime = now + 120000; // 2 minutos a partir da visualização
             localStorage.setItem(storageKey, expiryTime.toString());
           } else {
             return; // Audio espera play
           }
        }

        const timeLeft = Math.max(0, Math.ceil((expiryTime - now) / 1000));
        
        if (timeLeft > 0 || (now - expiryTime < 5000)) {
           newTimers.push({ 
             messageId: message.id, 
             timeLeft: timeLeft, 
             expiryTime: expiryTime,
             status: timeLeft <= 0 ? 'deleting' : 'counting', 
             messageType 
           });
        }
      });

      if (newTimers.length === 0) return prev;
      return [...prev, ...newTimers];
    });

  }, [messages, user, deletedMessages, getMessageType]);

  // Loop de contagem
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageTimers(prev => {
        if (prev.length === 0) return prev;

        const now = Date.now();
        const updatedTimers: MessageTimer[] = [];
        const messagesToDelete: string[] = [];
        let hasChanges = false;

        prev.forEach(timer => {
          if (timer.status === 'deleted') {
             hasChanges = true;
             return; 
          }

          const realTimeLeft = Math.max(0, Math.ceil((timer.expiryTime - now) / 1000));
          
          if (realTimeLeft <= 0 && timer.status === 'counting') {
             hasChanges = true;
             if (timer.messageType === 'text') {
                updatedTimers.push({
                   ...timer,
                   timeLeft: 0,
                   status: 'deleting',
                   currentText: messages?.find(m => m.id === timer.messageId)?.content || '',
                });
             } else {
                updatedTimers.push({ ...timer, timeLeft: 5, status: 'showingUndoing' });
             }
          } 
          else if (timer.status === 'deleting') {
             const timeSinceExpiry = Math.floor((now - timer.expiryTime) / 1000); 
             
             if (timeSinceExpiry > 5) { 
                updatedTimers.push({ ...timer, status: 'showingUndoing', timeLeft: 5, currentText: undefined });
             } else {
                if (timer.currentText) {
                   const originalText = messages?.find(m => m.id === timer.messageId)?.content || '';
                   const ratio = Math.min(1, timeSinceExpiry / 5); 
                   const lettersToKeep = Math.floor(originalText.length * (1 - ratio));
                   updatedTimers.push({ ...timer, currentText: originalText.slice(0, lettersToKeep) });
                } else {
                   updatedTimers.push(timer);
                }
             }
             hasChanges = true;
          }
          else if (timer.status === 'showingUndoing') {
             if (timer.timeLeft <= 0) {
                messagesToDelete.push(timer.messageId);
                if (user) localStorage.removeItem(`timer_${user.id}_${timer.messageId}`);
                updatedTimers.push({ ...timer, status: 'deleted' });
             } else {
                updatedTimers.push({ ...timer, timeLeft: timer.timeLeft - 1 });
             }
             hasChanges = true;
          } 
          else {
             if (timer.timeLeft !== realTimeLeft) {
                updatedTimers.push({ ...timer, timeLeft: realTimeLeft });
                hasChanges = true;
             } else {
                updatedTimers.push(timer);
             }
          }
        });

        if (messagesToDelete.length > 0) deleteMessages(messagesToDelete);
        return hasChanges ? updatedTimers : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [messages, user]);

  const deleteMessages = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    try {
      await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: null, media_urls: null }).in('id', messageIds);
      setDeletedMessages(prev => {
        const newSet = new Set(prev);
        messageIds.forEach(id => newSet.add(id));
        return newSet;
      });
    } catch (error) {
      console.error('Erro ao excluir mensagens:', error);
    }
  };

  const getMessageState = (messageId: string) => messageTimers.find(timer => timer.messageId === messageId);

  // --- Realtime & View Update ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("global-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => { 
        refetchMessages(); 
        refetchConversations(); 
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => { refetchConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchMessages, refetchConversations, user]);

  useEffect(() => { 
    if (messages && messages.length > 0) {
      if (isAtBottom) setTimeout(() => scrollToBottom(false), 100); 
    }
  }, [messages, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (!attentionCalls || attentionCalls.length === 0) return;
    if (isAtBottom) setTimeout(() => scrollToBottom(false), 100);
  }, [attentionCalls, isAtBottom, scrollToBottom]);

  useEffect(() => { 
    if (selectedConversation) setTimeout(() => scrollToBottom(true), 200); 
  }, [selectedConversation, scrollToBottom]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !selectedConversation || !user) return;
    const { data: msg, error } = await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, content: text }).select().single();
    if (error) { toast({ title: "Erro ao enviar", variant: "destructive" }); return; }
    if (msg) {
      const { saveMentions } = await import("@/utils/mentionsHelper");
      await saveMentions(msg.id, "message", text, user.id);
      try { await sendPushEvent({ eventType: 'message', messageId: msg.id }); } catch (e) { console.log('push message falhou', e); }
      await refetchMessages();
      setTimeout(() => scrollToBottom(true), 100);
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
      const { data: mediaMsg } = await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, media_urls: urls }).select().single();
      try { if (mediaMsg?.id) await sendPushEvent({ eventType: 'message', messageId: mediaMsg.id }); } catch (e) { console.log('push media falhou', e); }
      await refetchMessages();
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
      const { data: audioMsg } = await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, media_urls: [publicUrl] }).select().single();
      try { if (audioMsg?.id) await sendPushEvent({ eventType: 'message', messageId: audioMsg.id }); } catch (e) { console.log('push audio falhou', e); }
      await refetchMessages();
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

  type TimelineItem =
    | { kind: 'message'; msg: any }
    | { kind: 'attention'; call: AttentionCallRow };

  const timeline: TimelineItem[] = useMemo(() => {
    const msgItems: TimelineItem[] = (messages || []).map((m: any) => ({ kind: 'message', msg: m }));
    const attItems: TimelineItem[] = (isPrivateChat ? (attentionCalls || []) : []).map((c) => ({ kind: 'attention', call: c }));
    const all = [...msgItems, ...attItems];
    all.sort((a, b) => {
      const aTime = a.kind === 'message' ? a.msg.created_at : a.call.created_at;
      const bTime = b.kind === 'message' ? b.msg.created_at : b.call.created_at;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
    return all;
  }, [messages, attentionCalls, isPrivateChat]);

  const showSidebar = !isMobile || (isMobile && !selectedConversation);
  const showChat = !isMobile || (isMobile && selectedConversation);

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen bg-background overflow-hidden relative">
      {openMenuId && (
        <LanguageMenuModal
          messageId={openMenuId}
          originalText={getSelectedMessageText()}
          currentTranslation={translations.find(t => t.messageId === openMenuId)}
          onTranslate={handleTranslate}
          onClose={() => setOpenMenuId(null)}
        />
      )}

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
                    const hasUnreadMessages = conv.unreadCount > 0;
                    
                    return (
                      <button 
                        key={conv.id} 
                        onClick={() => setSelectedConversation(conv.id)} 
                        className={cn(
                          "flex items-center gap-3 p-4 border-b border-muted/40 hover:bg-accent/40 transition-all text-left w-full relative",
                          isActive && "bg-accent/60 border-l-4 border-l-primary pl-[13px]"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-background">
                            <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                            <AvatarFallback className="bg-muted font-semibold">
                              {conv.is_group ? <Users className="h-4 w-4" /> : otherParticipant?.profiles?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {hasUnreadMessages && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-background">
                              <span className="text-[10px] font-bold text-white">
                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold truncate text-sm">
                              {conv.name || otherParticipant?.profiles?.username || "Sala Privada"}
                            </span>
                            {lastMessage && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                {new Date(lastMessage.created_at).toLocaleDateString() === new Date().toLocaleDateString() 
                                  ? new Date(lastMessage.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                  : new Date(lastMessage.created_at).toLocaleDateString()
                                }
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMessage?.content 
                              ? (lastMessage.user_id === user?.id ? "Você: " : "") + lastMessage.content 
                              : (lastMessage?.media_urls ? "📷 Mídia enviada" : "Toque para conversar")
                            }
                          </p>
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
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {peer?.profiles?.username?.[0]?.toUpperCase() || <User />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <h3 className="font-semibold flex items-center gap-2">
                          {conv?.name || peer?.profiles?.username || "Chat"}
                          {peer?.user_id && (
                            <>
                              <UserLink
                                userId={peer.user_id}
                                username={peer.profiles?.username || ""}
                                className="opacity-0 w-0 h-0 overflow-hidden"
                              />
                              <MovementStatusBadge userId={peer.user_id} />
                            </>
                          )}
                        </h3>
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Online
                        </p>
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
              {!isLoadingMessages && (() => {
                let lastNonOwnSenderId: string | null = null;

                return timeline.map((item) => {
                  if (item.kind === 'attention') {
                    lastNonOwnSenderId = null;
                    const call = item.call;
                    const isOwnCall = call.sender_id === user?.id;
                    const senderName = isOwnCall ? 'Você' : (privatePeerProfile?.username || 'Usuário');
                    const receiverName = isOwnCall ? (privatePeerProfile?.username || 'usuário') : 'você';
                    const title = isOwnCall
                      ? `Você chamou a atenção de ${receiverName}`
                      : `${senderName} chamou sua atenção`;

                    return (
                      <div key={`attention-${call.id}`} className="flex w-full justify-center">
                        <div className="max-w-[95%] sm:max-w-[75%] rounded-xl border bg-muted/40 backdrop-blur px-3 py-2 flex items-center gap-3 shadow-sm">
                          <img src="/icon-192.png" alt="UnDoInG" className="h-7 w-7 rounded-md border bg-background" />
                          {!isOwnCall && privatePeerProfile?.avatar_url ? (
                            <img
                              src={privatePeerProfile.avatar_url}
                              alt={senderName}
                              className="h-7 w-7 rounded-full border bg-background object-cover"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full border bg-background flex items-center justify-center text-xs font-bold">
                              {isOwnCall ? 'EU' : (senderName?.[0] || '?')}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-destructive">🚨 Chamar Atenção</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground break-words">
                              {title}{call.message ? ` — ${call.message}` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const msg = item.msg;
                  const isOwn = msg.user_id === user?.id;
                  const showAvatar = !isOwn && lastNonOwnSenderId !== msg.user_id;

                  if (!isOwn) lastNonOwnSenderId = msg.user_id;
                  else lastNonOwnSenderId = null;
                const timerState = getMessageState(msg.id);
                const messageType = getMessageType(msg);
                const translationState = getTranslationState(msg.id);
                const speechState = getSpeechState(msg.id);

                if (timerState?.status === 'deleted' || deletedMessages.has(msg.id)) return null;

                let displayText = msg.content;
                if (timerState?.status === 'deleting' && timerState.currentText) {
                  displayText = timerState.currentText;
                } else if (translationState?.isTranslated && translationState.translatedText) {
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
                            {timerState.status === 'deleting' && `Apagando...`}
                            {timerState.status === 'showingUndoing' && `${timerState.timeLeft}s`}
                          </span>
                        </div>
                      )}

                      {!isOwn && messageType === 'audio' && !timerState && (
                        <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Reproduza para iniciar timer</span>
                        </div>
                      )}

                      {timerState?.status === 'showingUndoing' && (
                        <div className="px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg mb-2 animate-pulse">
                          <span className="text-destructive font-mono font-bold tracking-wider">UnDoInG</span>
                        </div>
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
                          <div className="break-words overflow-hidden">
                            <MentionText text={displayText} />
                            {translationState?.isLoading && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Traduzindo...</span>
                              </div>
                            )}
                            {speechState?.isSpeaking && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                                <Volume2 className="h-3 w-3 animate-pulse" />
                                <span>Reproduzindo áudio...</span>
                              </div>
                            )}
                          </div>
                          
                          {!isOwn && msg.content && (
                            <div className="flex justify-between items-center mt-2 border-t border-foreground/5 pt-1 relative">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[10px] opacity-60", isOwn ? "text-primary-foreground" : "text-muted-foreground")}>
                                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                {translationState?.isTranslated && (
                                  <div className="flex items-center gap-1 text-[9px] opacity-70 text-muted-foreground font-medium">
                                    <Globe className="h-2 w-2" />
                                    <span className="flex items-center gap-1">
                                      {translationState.sourceLang && translationState.sourceLang !== 'auto' && (
                                        <>
                                          <span>{AVAILABLE_LANGUAGES.find(l => l.code === translationState.sourceLang)?.flag || '🌐'}</span>
                                          <ArrowRight className="h-2 w-2" />
                                        </>
                                      )}
                                      <span>{AVAILABLE_LANGUAGES.find(l => l.code === translationState.targetLang)?.flag || '🌐'}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 px-2 text-[10px] transition-all", speechState?.isSpeaking ? "text-primary opacity-100 font-medium" : "text-muted-foreground opacity-70 hover:opacity-100")}
                                  onClick={() => speechState?.isSpeaking ? stopSpeech(msg.id) : speakText(displayText, msg.id, translationState?.isTranslated ? translationState.targetLang : 'pt')}
                                >
                                  {speechState?.isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                </Button>

                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className={cn("h-6 px-2 text-[10px] opacity-60 hover:opacity-100 transition-all flex items-center gap-1", translationState?.isLoading && "opacity-100", translationState?.isTranslated && "text-primary opacity-100")}
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(msg.id); }}
                                  disabled={translationState?.isLoading}
                                >
                                  {translationState?.isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Languages className="h-3 w-3 mr-1" />} 
                                  {translationState?.isTranslated ? "Traduzido" : "Traduzir"}
                                </Button>
                              </div>
                            </div>
                          )}
                          {isOwn && <span className="text-[10px] opacity-60 block text-right mt-1">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
                });
              })()}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {showScrollButton && <Button size="icon" className="absolute bottom-24 right-6 rounded-full shadow-xl z-20 animate-in fade-in zoom-in duration-300" onClick={() => scrollToBottom(false)}><ArrowDown className="h-5 w-5" /></Button>}

            <div className="p-4 bg-background border-t">
               <div className="max-w-4xl mx-auto w-full">
                 <MessageInput
                   onSendMessage={handleSendMessage}
                   onAudioReady={handleAudioUpload}
                   onMediaReady={handleMediaUpload}
                   attentionReceiverId={isPrivateChat ? privatePeerId : null}
                   disabled={!selectedConversation}
                 />
               </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
             <div className="w-32 h-32 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
               <MessageSquarePlus className="h-16 w-16 text-primary" />
             </div>
             <h1 className="text-3xl font-bold tracking-tight mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Suas Mensagens</h1>
             <p className="text-muted-foreground max-w-md mb-8 text-lg">Selecione uma conversa na barra lateral ou inicie um novo chat com seus amigos.</p>
          </div>
        )}
      </div>
    </div>
  );
}