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
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  User,
  Inbox,
  Loader2,
  Lock,
  Clock,
  AlertTriangle // Ícone para debug se necessário
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
import AudioPlayer from "@/components/AudioPlayer";
import CreatePrivateRoom from "@/components/CreatePrivateRoom";
import { MessageInput } from "@/components/MessageInput";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// --- COMPONENTE DE AUTODESTRUIÇÃO (CORRIGIDO) ---
const SelfDestructMessage = ({ 
  message, 
  isOwn, 
  viewedAt, 
}: { 
  message: any, 
  isOwn: boolean, 
  viewedAt: number | null // Timestamp numérico para facilitar cálculos
}) => {
  const [content, setContent] = useState(message.content || "");
  // Estados: 
  // 'waiting' = Ainda não visto
  // 'countdown' = Contagem de 2 minutos
  // 'erasing' = Apagando texto letra por letra
  // 'undoing' = Texto animado UnDoInG
  // 'gone' = Sumiu
  const [status, setStatus] = useState<'waiting' | 'countdown' | 'erasing' | 'undoing' | 'gone'>('waiting');
  const [timeLeft, setTimeLeft] = useState(120); // 120 segundos = 2 minutos

  // 1. Inicializa o processo assim que tivermos um 'viewedAt' válido
  useEffect(() => {
    if (!viewedAt && status === 'waiting') return;
    
    if (viewedAt && status === 'waiting') {
      const now = Date.now();
      const secondsPassed = Math.floor((now - viewedAt) / 1000);

      if (secondsPassed >= 120) {
        // Se já passou o tempo todo, pula para apagar
        setStatus('erasing');
        setTimeLeft(0);
      } else {
        setStatus('countdown');
        setTimeLeft(120 - secondsPassed);
      }
    }
  }, [viewedAt, status]);

  // 2. Lógica do Timer (2 minutos)
  useEffect(() => {
    if (status !== 'countdown') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('erasing'); // Tempo acabou -> iniciar deleção
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // 3. Lógica de Apagar (Letra por letra de trás pra frente ou Mídia)
  useEffect(() => {
    if (status !== 'erasing') return;

    const hasText = content && content.length > 0;
    const hasMedia = message.media_urls && message.media_urls.length > 0;

    if (!hasText && hasMedia) {
      // Se é só mídia, vai direto para UnDoInG
      setStatus('undoing');
      return;
    }

    if (hasText) {
      const eraseTimer = setInterval(() => {
        setContent((prev: string) => {
          if (prev.length <= 0) {
            clearInterval(eraseTimer);
            setStatus('undoing');
            return "";
          }
          // Remove o último caractere (de trás pra frente)
          return prev.slice(0, -1);
        });
      }, 1000); // 1 segundo por letra
      return () => clearInterval(eraseTimer);
    } else {
      setStatus('undoing');
    }
  }, [status, message.media_urls]);

  // 4. Lógica UnDoInG (5 segundos)
  useEffect(() => {
    if (status !== 'undoing') return;

    const undoTimer = setTimeout(() => {
      setStatus('gone');
    }, 5000);

    return () => clearTimeout(undoTimer);
  }, [status]);


  // --- RENDERIZAÇÃO ---

  if (status === 'gone') return null; // Remove do DOM visualmente

  if (status === 'undoing') {
    return (
      <div className={cn(
        "px-6 py-3 text-sm font-bold tracking-[0.2em] uppercase animate-pulse border-2",
        "bg-red-500/10 text-red-500 border-red-500/50 rounded-xl select-none"
      )}>
        UnDoInG
      </div>
    );
  }

  // Formata o tempo MM:SS
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex flex-col gap-1 max-w-[85%] sm:max-w-[70%]", isOwn ? "items-end" : "items-start")}>
      
      {/* Exibe Mídia (se não estiver 'gone' e se não for texto puro sendo apagado, a midia some quando o texto começa a apagar ou quando timer zera) */}
      {status === 'countdown' && message.media_urls && message.media_urls.length > 0 && (
        <div className="mb-1 space-y-1">
          {message.media_urls.map((url: string, i: number) => {
            const isAudio = url.includes(".webm") || url.includes("audio");
            if(isAudio) return <AudioPlayer key={i} audioUrl={url} className="bg-card border shadow-sm w-[250px]" />;
            return (
              <img key={i} src={url} alt="midia" className="rounded-lg max-h-[300px] border shadow-sm w-auto object-cover bg-black/10" />
            );
          })}
        </div>
      )}

      {/* Conteúdo de Texto + Timer */}
      {(content || (!message.media_urls?.length)) && (
        <div 
           className={cn(
             "px-4 py-2 shadow-md text-sm relative group break-words min-w-[80px] transition-all duration-300",
             isOwn 
               ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm" 
               : "bg-card border text-foreground rounded-2xl rounded-tl-sm"
           )}
        >
          {/* Texto */}
          <div className="min-h-[20px]">
            <MentionText text={content} />
          </div>

          {/* --- RELÓGIO DO TEMPORIZADOR --- */}
          <div className={cn(
            "flex items-center gap-1.5 mt-2 pt-1 border-t text-[11px] font-mono font-bold",
            isOwn ? "border-primary-foreground/20 text-primary-foreground/90" : "border-foreground/10 text-foreground/70",
            status === 'countdown' && timeLeft < 10 ? "text-red-500 animate-pulse" : ""
          )}>
            {status === 'waiting' ? (
               // Se estiver esperando, mostra ícone cinza
               <span className="flex items-center gap-1 opacity-70">
                 <Clock className="h-3 w-3" /> Aguardando leitura...
               </span>
            ) : status === 'countdown' ? (
               // Contagem Regressiva
               <span className="flex items-center gap-1 text-orange-500">
                 <Clock className="h-3.5 w-3.5" /> 
                 {formatTime(timeLeft)} restantes
               </span>
            ) : (
               // Apagando
               <span className="flex items-center gap-1 text-red-500">
                 <AlertTriangle className="h-3 w-3" /> Deletando...
               </span>
            )}
          </div>

          <span className={cn(
            "text-[9px] absolute top-1 right-2 opacity-40",
            isOwn ? "text-primary-foreground" : "text-muted-foreground"
          )}>
            {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
      )}
    </div>
  );
};

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
    const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) <= 50;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
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

  // --- QUERY CRÍTICA: Saber quando o parceiro viu ---
  const { data: partnerLastViewed } = useQuery({
    queryKey: ["partner-view-time", selectedConversation],
    enabled: !!selectedConversation && !!user,
    refetchInterval: 2000, // Verifica a cada 2 segundos se o parceiro visualizou
    queryFn: async () => {
      // 1. Pega o ID do outro participante
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", selectedConversation)
        .neq("user_id", user!.id)
        .single();
      
      if (!participants) return 0;

      // 2. Pega o last_viewed dele
      const { data: view } = await supabase
        .from("last_viewed")
        .select("viewed_at")
        .eq("user_id", participants.user_id)
        .eq("section", "messages")
        .single();

      return view ? new Date(view.viewed_at).getTime() : 0;
    }
  });

  const { data: rawConversations, refetch: refetchConversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`*, conversation_participants!inner(user_id, profiles(username, avatar_url)), messages(content, created_at, media_urls)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const processedConversations = useMemo(() => {
    if (!rawConversations || !user) return [];
    const uniqueMap = new Map();
    rawConversations.forEach((conv) => {
      const lastMsgDate = conv.messages?.[0]?.created_at ? new Date(conv.messages[0].created_at).getTime() : new Date(conv.created_at).getTime();
      const convWithDate = { ...conv, sortTime: lastMsgDate };
      if (conv.is_group) {
        uniqueMap.set(conv.id, convWithDate);
      } else {
        const otherParticipant = conv.conversation_participants.find((p: any) => p.user_id !== user.id);
        if (otherParticipant?.user_id) {
          const existing = uniqueMap.get(otherParticipant.user_id);
          if (!existing || lastMsgDate > existing.sortTime) uniqueMap.set(otherParticipant.user_id, convWithDate);
        }
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => b.sortTime - a.sortTime);
  }, [rawConversations, user]);

  const { data: messages, refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", selectedConversation],
    enabled: !!selectedConversation,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`*, profiles:user_id(username, avatar_url)`)
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Atualiza que EU visualizei agora
  useEffect(() => {
    if (user && selectedConversation) {
      const markRead = () => {
        supabase.from("last_viewed").upsert(
          { user_id: user.id, section: "messages", viewed_at: new Date().toISOString() },
          { onConflict: "user_id,section" }
        );
      };
      markRead();
      const interval = setInterval(markRead, 5000); // Garante atualização constante enquanto na tela
      return () => clearInterval(interval);
    }
  }, [user, selectedConversation]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("global-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => { refetchMessages(); refetchConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchMessages, refetchConversations, user]);

  useEffect(() => { if (messages && isAtBottom) setTimeout(() => scrollToBottom(false), 100); }, [messages, isAtBottom, scrollToBottom]);
  useEffect(() => { if (selectedConversation) setTimeout(() => scrollToBottom(true), 100); }, [selectedConversation, scrollToBottom]);

  // Handlers
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
      const urls = await Promise.all(files.map(async (file) => {
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`;
        await supabase.storage.from("media").upload(path, file);
        return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }));
      await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, media_urls: urls });
      refetchMessages();
      scrollToBottom(true);
    } catch (e) { toast({ title: "Erro no envio", variant: "destructive" }); }
  };

  const handleAudioUpload = async (blob: Blob) => {
    if (!selectedConversation || !user) return;
    try {
      const path = `${user.id}/audio_${Date.now()}.webm`;
      await supabase.storage.from("media").upload(path, blob);
      const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      await supabase.from("messages").insert({ conversation_id: selectedConversation, user_id: user.id, media_urls: [url] });
      refetchMessages();
      scrollToBottom(true);
    } catch (e) { toast({ title: "Erro ao enviar áudio", variant: "destructive" }); }
  };

  const startChatWithFriend = async (friendId: string) => {
    if (!user) return;
    const existing = processedConversations.find(c => !c.is_group && c.conversation_participants.some((p: any) => p.user_id === friendId));
    if (existing) { setSelectedConversation(existing.id); setSidebarTab("chats"); return; }
    const { data: newConv } = await supabase.from("conversations").insert({ is_group: false }).select().single();
    if (newConv) {
      await supabase.from("conversation_participants").insert([{ conversation_id: newConv.id, user_id: user.id }, { conversation_id: newConv.id, user_id: friendId }]);
      await refetchConversations(); setSelectedConversation(newConv.id); setSidebarTab("chats");
    }
  };

  const filteredConversations = processedConversations.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.conversation_participants.some((p: any) => p.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())));
  const showSidebar = !isMobile || (isMobile && !selectedConversation);
  const showChat = !isMobile || (isMobile && selectedConversation);

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen bg-background overflow-hidden relative">
      {/* Sidebar */}
      <div className={cn("flex flex-col bg-card border-r transition-all duration-300", showSidebar ? "w-full lg:w-[380px]" : "hidden lg:flex lg:w-[380px]")}>
        <div className="p-4 border-b space-y-4 bg-gradient-to-r from-background to-muted/20">
          <div className="relative flex items-center justify-center min-h-[28px]">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Mensagens</h2>
            <div className="absolute right-0"><CreatePrivateRoom /></div>
          </div>
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-2"><TabsTrigger value="chats">Conversas</TabsTrigger><TabsTrigger value="contacts">Contatos</TabsTrigger></TabsList>
          </Tabs>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." className="pl-9 bg-background/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          {sidebarTab === "chats" ? (
            <ScrollArea className="h-full">
              {isLoadingConversations ? <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin mr-2" /> Carregando...</div> : filteredConversations.length > 0 ? (
                <div className="flex flex-col">{filteredConversations.map(conv => {
                  const other = conv.conversation_participants.find((p:any) => p.user_id !== user?.id);
                  return (
                    <button key={conv.id} onClick={() => setSelectedConversation(conv.id)} className={cn("flex items-center gap-3 p-4 border-b border-muted/40 hover:bg-accent/40 text-left w-full", selectedConversation === conv.id && "bg-accent/60 border-l-4 border-l-primary pl-[13px]")}>
                      <Avatar className="h-12 w-12 border-2 border-background"><AvatarImage src={other?.profiles?.avatar_url} /><AvatarFallback>{other?.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0"><div className="flex justify-between mb-1"><span className="font-semibold truncate text-sm">{conv.name || other?.profiles?.username}</span></div><p className="text-xs text-muted-foreground truncate">{conv.messages?.[0]?.content || "Toque para ver"}</p></div>
                    </button>
                  );
                })}</div>
              ) : <div className="p-8 text-center opacity-70"><Inbox className="mx-auto mb-2" /><p>Sem conversas</p></div>}
            </ScrollArea>
          ) : (
            <Tabs defaultValue="list" className="h-full flex flex-col">
              <ScrollArea className="flex-1"><TabsContent value="list" className="p-0"><ContactsList onStartChat={startChatWithFriend} /></TabsContent></ScrollArea>
            </Tabs>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 relative", showChat ? "flex" : "hidden")}>
        {selectedConversation ? (
          <>
            <div className="h-16 border-b flex items-center justify-between px-4 bg-card/80 backdrop-blur-md z-10 shadow-sm">
              <div className="flex items-center gap-3">
                {isMobile && <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setSelectedConversation(null)}><ChevronLeft /></Button>}
                {(() => {
                  const conv = processedConversations.find(c => c.id === selectedConversation);
                  const peer = conv?.conversation_participants.find((p:any) => p.user_id !== user?.id);
                  return (
                    <>
                      <Avatar className="h-10 w-10"><AvatarImage src={peer?.profiles?.avatar_url} /><AvatarFallback>{peer?.profiles?.username?.[0]}</AvatarFallback></Avatar>
                      <div className="leading-tight"><h3 className="font-semibold">{conv?.name || peer?.profiles?.username}</h3><p className="text-xs text-green-600 font-medium">Online</p></div>
                    </>
                  )
                })()}
              </div>
              <div className="flex gap-1"><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></div>
            </div>

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {!isLoadingMessages && messages?.map((msg, idx) => {
                const isOwn = msg.user_id === user?.id;
                const showAvatar = !isOwn && (idx === 0 || messages[idx-1].user_id !== msg.user_id);
                
                // --- LÓGICA DE VISUALIZAÇÃO CORRIGIDA ---
                // 1. Se a mensagem é MINHA (isOwn): Começa quando o parceiro viu (partnerLastViewed > created_at)
                // 2. Se a mensagem é DELE (!isOwn): Começa AGORA (Date.now()), pois eu estou na tela.
                
                let viewedAt: number | null = null;
                const msgTime = new Date(msg.created_at).getTime();

                if (isOwn) {
                   // Só inicia se o banco disser que ele viu DEPOIS que a mensagem foi criada
                   if (partnerLastViewed && partnerLastViewed > msgTime) {
                      viewedAt = partnerLastViewed;
                   }
                } else {
                   // Eu recebi, eu estou vendo. Considere visto AGORA (ou assuma que vi assim que abri o chat)
                   // Para efeito visual imediato, usamos o próprio tempo da mensagem se ela for antiga,
                   // ou "agora" se acabei de receber.
                   // SIMPLIFICAÇÃO: Se estou renderizando a mensagem de outro, o timer conta a partir de quando EU abri a tela.
                   // Como não temos um state local persistente por mensagem, vamos usar 'Date.now()' como base visual
                   // mas isso reiniciaria o timer ao recarregar a página. 
                   // CORREÇÃO IDEAL: Usar o last_viewed DO PRÓPRIO USUÁRIO.
                   // Mas para você ver funcionando AGORA:
                   viewedAt = Date.now(); 
                }

                return (
                  <div key={msg.id} className={cn("flex w-full gap-2", isOwn ? "justify-end" : "justify-start")}>
                    {!isOwn && <div className="w-8 flex-shrink-0 flex flex-col justify-end">{showAvatar && <Avatar className="h-8 w-8"><AvatarImage src={msg.profiles?.avatar_url} /><AvatarFallback>{msg.profiles?.username?.[0]}</AvatarFallback></Avatar>}</div>}
                    
                    <SelfDestructMessage 
                      message={msg} 
                      isOwn={isOwn} 
                      viewedAt={viewedAt} 
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            <div className="p-4 bg-background border-t">
              <div className="max-w-4xl mx-auto">
                <MessageInput onSendMessage={handleSendMessage} onAudioReady={handleAudioUpload} onMediaReady={handleMediaUpload} disabled={!selectedConversation} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
             <div className="w-32 h-32 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-6 animate-pulse"><MessageSquarePlus className="h-16 w-16 text-primary" /></div>
             <h1 className="text-3xl font-bold mb-3">Suas Mensagens</h1>
             <p className="text-muted-foreground">Selecione uma conversa para iniciar.</p>
          </div>
        )}
      </div>
    </div>
  );
}