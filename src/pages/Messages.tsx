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

// Interface para controle de temporizadores das mensagens
interface MessageTimer {
  messageId: string;
  timeLeft: number; // em segundos
  status: 'counting' | 'deleting' | 'showingUndoing' | 'deleted';
  currentText?: string; // para o efeito de deleção letra por letra
  isAudioPlayed?: boolean; // para controlar se áudio foi ouvido
  deletionStartTime?: number; // timestamp quando iniciou a deleção
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // --- Estados de Navegação e UI ---
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"chats" | "contacts">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  
  // --- Refs e Estados de Scroll ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // --- Estado para controle dos temporizadores ---
  const [messageTimers, setMessageTimers] = useState<MessageTimer[]>([]);
  const [viewedMessages, setViewedMessages] = useState<Set<string>>(new Set());
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());
  const [playedAudios, setPlayedAudios] = useState<Set<string>>(new Set());

  // --- Scroll Helpers ---
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

  // --- Queries de Dados ---

  // 1. Perfil do Usuário
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("friend_code")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  // 2. Conversas (Salas) - Busca bruta do banco
  const { data: rawConversations, refetch: refetchConversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          conversation_participants!inner (
            user_id,
            profiles (username, avatar_url)
          ),
          messages (id, content, created_at, media_urls, user_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // 3. Processamento e Filtragem (Lógica de "Apenas 1 por usuário")
  const processedConversations = useMemo(() => {
    if (!rawConversations || !user) return [];

    const uniqueMap = new Map();

    rawConversations.forEach((conv) => {
      // Tenta encontrar a última mensagem para ordenação
      const lastMsgDate = conv.messages?.[0]?.created_at 
        ? new Date(conv.messages[0].created_at).getTime() 
        : new Date(conv.created_at).getTime();
      
      const convWithDate = { ...conv, sortTime: lastMsgDate };

      if (conv.is_group) {
        // Se for grupo, a chave é o ID da sala (único)
        uniqueMap.set(conv.id, convWithDate);
      } else {
        // Se for Chat Privado (DM), a chave é o ID do OUTRO participante
        const otherParticipant = conv.conversation_participants.find((p: any) => p.user_id !== user.id);
        const partnerId = otherParticipant?.user_id;

        if (partnerId) {
          // Se já existe uma conversa com esse usuário, mantemos apenas a mais recente
          const existing = uniqueMap.get(partnerId);
          if (!existing || lastMsgDate > existing.sortTime) {
            uniqueMap.set(partnerId, convWithDate);
          }
        }
      }
    });

    // Converte o Map de volta para Array e ordena pela data mais recente
    return Array.from(uniqueMap.values()).sort((a, b) => b.sortTime - a.sortTime);
  }, [rawConversations, user]);

  // 4. Mensagens da Conversa Atual (FILTRANDO MENSAGENS EXCLUÍDAS)
  const { data: messages, refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", selectedConversation],
    enabled: !!selectedConversation,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq("conversation_id", selectedConversation)
        .is("deleted_at", null) // APENAS MENSAGENS NÃO EXCLUÍDAS
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // --- Efeitos para controle dos temporizadores ---

  // Inicializar temporizadores para mensagens não visualizadas
  useEffect(() => {
    if (!messages || !user) return;

    const newTimers: MessageTimer[] = [];
    const newViewedMessages = new Set(viewedMessages);

    messages.forEach(message => {
      // Se a mensagem não é do usuário atual e ainda não foi visualizada
      if (message.user_id !== user.id && !viewedMessages.has(message.id) && !deletedMessages.has(message.id)) {
        
        // Verifica se é áudio
        const isAudio = message.media_urls && message.media_urls.some((url: string) => 
          url.includes(".webm") || url.includes("audio")
        );

        // Se for áudio, só inicia o timer se já foi ouvido
        if (isAudio) {
          if (playedAudios.has(message.id)) {
            newTimers.push({
              messageId: message.id,
              timeLeft: 120, // 2 minutos em segundos
              status: 'counting',
              isAudioPlayed: true
            });
            newViewedMessages.add(message.id);
          }
        } else {
          // Para outros tipos de mensagem, inicia o timer imediatamente
          newTimers.push({
            messageId: message.id,
            timeLeft: 120, // 2 minutos em segundos
            status: 'counting'
          });
          newViewedMessages.add(message.id);
        }
      }
    });

    if (newTimers.length > 0) {
      setMessageTimers(prev => [...prev, ...newTimers]);
      setViewedMessages(newViewedMessages);
    }
  }, [messages, user, deletedMessages, playedAudios]);

  // Função para marcar áudio como ouvido
  const markAudioAsPlayed = useCallback((messageId: string) => {
    setPlayedAudios(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });

    // Inicia o timer para o áudio ouvido - MESMA REGRA DAS MENSAGENS DE TEXTO
    setMessageTimers(prev => {
      const existingTimer = prev.find(timer => timer.messageId === messageId);
      if (existingTimer) return prev;

      return [...prev, {
        messageId,
        timeLeft: 120, // 2 minutos fixos - MESMO TEMPO QUE MENSAGENS DE TEXTO
        status: 'counting',
        isAudioPlayed: true
      }];
    });
  }, []);

  // Função para arquivar mensagem antes de excluir
  const archiveMessage = async (messageId: string) => {
    try {
      // Busca a mensagem original
      const { data: originalMessage, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Arquiva a mensagem
      const { error: archiveError } = await supabase
        .from('temporary_messages_archive')
        .insert({
          original_message_id: messageId,
          conversation_id: originalMessage.conversation_id,
          user_id: originalMessage.user_id,
          content: originalMessage.content,
          media_urls: originalMessage.media_urls,
          message_type: originalMessage.content ? 'text' : 'media',
          original_created_at: originalMessage.created_at,
          deletion_reason: 'timer_expired'
        });

      if (archiveError) throw archiveError;

      return true;
    } catch (error) {
      console.error('Erro ao arquivar mensagem:', error);
      return false;
    }
  };

  // Função para excluir mensagens do banco
  const deleteMessages = async (messageIds: string[]) => {
    try {
      // Primeiro arquiva as mensagens
      const archivePromises = messageIds.map(messageId => archiveMessage(messageId));
      await Promise.all(archivePromises);

      // Depois marca como excluídas na tabela original
      const { error } = await supabase
        .from('messages')
        .update({ 
          deleted_at: new Date().toISOString(),
          content: null,
          media_urls: null
        })
        .in('id', messageIds);

      if (error) throw error;

      // Atualiza o estado local
      setDeletedMessages(prev => {
        const newSet = new Set(prev);
        messageIds.forEach(id => newSet.add(id));
        return newSet;
      });

      // Atualiza a lista de mensagens
      refetchMessages();
      refetchConversations();
    } catch (error) {
      console.error('Erro ao excluir mensagens:', error);
    }
  };

  // Efeito principal para controle dos temporizadores
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageTimers(prev => {
        const updatedTimers: MessageTimer[] = [];
        const messagesToDelete: string[] = [];

        prev.forEach(timer => {
          switch (timer.status) {
            case 'counting':
              if (timer.timeLeft <= 1) {
                // Inicia processo de deleção - SEMPRE 2 MINUTOS INDEPENDENTE DO TIPO
                const message = messages?.find(m => m.id === timer.messageId);
                
                // Verifica se é áudio
                const isAudio = message?.media_urls && message.media_urls.some((url: string) => 
                  url.includes(".webm") || url.includes("audio")
                );

                if (message?.content && !isAudio) {
                  // Para mensagens de texto, inicia deleção letra por letra com tempo fixo
                  updatedTimers.push({
                    ...timer,
                    status: 'deleting',
                    currentText: message.content,
                    timeLeft: 120, // SEMPRE 2 MINUTOS (120 segundos) para deleção
                    deletionStartTime: Date.now()
                  });
                } else {
                  // Para áudios e outras mídias, vai direto para "UnDoInG" após os 2 minutos
                  updatedTimers.push({
                    ...timer,
                    status: 'showingUndoing',
                    timeLeft: 5 // 5 segundos para "UnDoInG"
                  });
                }
              } else {
                updatedTimers.push({
                  ...timer,
                  timeLeft: timer.timeLeft - 1
                });
              }
              break;

            case 'deleting':
              if (timer.timeLeft <= 1) {
                // Terminou o tempo de deleção, mostra "UnDoInG"
                updatedTimers.push({
                  ...timer,
                  status: 'showingUndoing',
                  timeLeft: 5,
                  currentText: undefined
                });
              } else {
                // Continua contagem regressiva e remove letras proporcionalmente
                const message = messages?.find(m => m.id === timer.messageId);
                const originalText = message?.content || '';
                const totalDeletionTime = 120; // 2 minutos fixos
                const elapsedTime = 120 - timer.timeLeft + 1; // Tempo decorrido
                
                // Calcula quantas letras devem ser removidas baseado no tempo decorrido
                const lettersToKeep = Math.max(0, Math.floor(originalText.length * (1 - (elapsedTime / totalDeletionTime))));
                const currentText = originalText.slice(0, lettersToKeep);

                updatedTimers.push({
                  ...timer,
                  timeLeft: timer.timeLeft - 1,
                  currentText: currentText
                });
              }
              break;

            case 'showingUndoing':
              if (timer.timeLeft <= 1) {
                // Marca para exclusão
                messagesToDelete.push(timer.messageId);
                updatedTimers.push({
                  ...timer,
                  status: 'deleted'
                });
              } else {
                updatedTimers.push({
                  ...timer,
                  timeLeft: timer.timeLeft - 1
                });
              }
              break;

            default:
              // Remove timers deletados
              if (timer.status !== 'deleted') {
                updatedTimers.push(timer);
              }
          }
        });

        // Exclui mensagens marcadas para deleção
        if (messagesToDelete.length > 0) {
          deleteMessages(messagesToDelete);
        }

        return updatedTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [messages]);

  // Função para obter o estado atual de uma mensagem
  const getMessageState = (messageId: string) => {
    return messageTimers.find(timer => timer.messageId === messageId);
  };

  // Função para formatar o tempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Efeitos (Side Effects) ---

  // Realtime
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel("global-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        refetchMessages();
        refetchConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        refetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetchMessages, refetchConversations, user]);

  // Marcar como visto
  useEffect(() => {
    if (user && selectedConversation) {
      supabase.from("last_viewed").upsert(
        { user_id: user.id, section: "messages", viewed_at: new Date().toISOString() },
        { onConflict: "user_id,section" }
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
      });
    }
  }, [user, selectedConversation, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (messages && isAtBottom) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [selectedConversation, scrollToBottom]);

  // --- Handlers ---

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !selectedConversation || !user) return;
    
    const { data: msg } = await supabase.from("messages").insert({
      conversation_id: selectedConversation,
      user_id: user.id,
      content: text
    }).select().single();

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
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(filePath);
        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        user_id: user.id,
        media_urls: urls
      });
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
      
      await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        user_id: user.id,
        media_urls: [publicUrl]
      });
      refetchMessages();
      scrollToBottom(true);
    } catch (e) {
      toast({ title: "Erro ao enviar áudio", variant: "destructive" });
    }
  };

  const startChatWithFriend = async (friendId: string) => {
    if (!user) return;
    
    // 1. Verifica primeiro na lista carregada se já existe conversa com este amigo
    const existingLocal = processedConversations.find(c => 
      !c.is_group && c.conversation_participants.some((p: any) => p.user_id === friendId)
    );

    if (existingLocal) {
      setSelectedConversation(existingLocal.id);
      setSidebarTab("chats");
      return;
    }

    // 2. Se não achou localmente (segurança), tenta criar
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
      console.error("Erro ao criar chat:", error);
      toast({ title: "Erro ao iniciar conversa", variant: "destructive" });
    }
  };

  // --- Filtro de busca visual ---
  const filteredConversations = processedConversations.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.conversation_participants.some((p: any) => p.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Lógica de visualização condicional para mobile
  const showSidebar = !isMobile || (isMobile && !selectedConversation);
  const showChat = !isMobile || (isMobile && selectedConversation);

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen bg-background overflow-hidden relative">
      
      {/* ================= SIDEBAR ================= */}
      <div 
        className={cn(
          "flex flex-col bg-card border-r transition-all duration-300",
          showSidebar ? "w-full lg:w-[380px]" : "hidden lg:flex lg:w-[380px]"
        )}
      >
        {/* Header da Sidebar */}
        <div className="p-4 border-b space-y-4 bg-gradient-to-r from-background to-muted/20">
          <div className="relative flex items-center justify-center min-h-[28px]">
            {/* Título Centralizado */}
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Mensagens
            </h2>
            
            {/* Botão Posicionado à Direita */}
            <div className="absolute right-0">
              <CreatePrivateRoom />
            </div>
          </div>

          {/* Tabs Principais */}
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="chats">Conversas</TabsTrigger>
              <TabsTrigger value="contacts">Contatos</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={sidebarTab === "chats" ? "Buscar conversas..." : "Buscar contatos..."}
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conteúdo da Sidebar */}
        <div className="flex-1 overflow-hidden relative">
          {sidebarTab === "chats" ? (
            <ScrollArea className="h-full">
              {isLoadingConversations ? (
                 <div className="flex items-center justify-center h-40 text-muted-foreground">
                   <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
                 </div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                <div className="flex flex-col">
                  {filteredConversations.map((conv) => {
                    const otherParticipant = conv.conversation_participants.find((p:any) => p.user_id !== user?.id);
                    
                    const lastMessage = conv.messages?.[0];
                    const isActive = selectedConversation === conv.id;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={cn(
                          "flex items-center gap-3 p-4 border-b border-muted/40 hover:bg-accent/40 transition-all text-left w-full",
                          isActive && "bg-accent/60 border-l-4 border-l-primary pl-[13px]"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-background">
                            <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                            <AvatarFallback className="bg-muted font-semibold">
                              {otherParticipant?.profiles?.username?.[0]?.toUpperCase() || <Users className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
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
                                  : new Date(lastMessage.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMessage?.content 
                              ? (lastMessage.user_id === user?.id ? "Você: " : "") + lastMessage.content 
                              : (lastMessage?.media_urls ? "📷 Mídia enviada" : "Toque para conversar")}
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
                  <Button variant="link" onClick={() => setSidebarTab("contacts")}>
                    Iniciar nova conversa
                  </Button>
                </div>
              )}
            </ScrollArea>
          ) : (
            /* ABA CONTATOS */
            <Tabs defaultValue="list" className="h-full flex flex-col">
               <div className="px-4 pb-2 bg-card border-b">
                 <TabsList className="w-full h-9 bg-muted/40">
                    <TabsTrigger value="list" className="text-xs flex-1">Meus Amigos</TabsTrigger>
                    <TabsTrigger value="requests" className="text-xs flex-1">Pedidos</TabsTrigger>
                    <TabsTrigger value="add" className="text-xs flex-1">Adicionar</TabsTrigger>
                 </TabsList>
               </div>
               
               <ScrollArea className="flex-1 bg-muted/10">
                 <TabsContent value="list" className="m-0 p-0">
                   <ContactsList onStartChat={startChatWithFriend} />
                 </TabsContent>
                 <TabsContent value="requests" className="m-0 p-4">
                   <FriendRequests />
                 </TabsContent>
                 <TabsContent value="add" className="m-0 p-4">
                    <div className="bg-card p-4 rounded-lg border shadow-sm">
                       <div className="flex items-center gap-2 mb-4 text-primary">
                          <UserPlus className="h-5 w-5" />
                          <h3 className="font-semibold">Adicionar novo amigo</h3>
                       </div>
                       <AddFriend userCode={profile?.friend_code} />
                    </div>
                 </TabsContent>
               </ScrollArea>
            </Tabs>
          )}
        </div>
      </div>

      {/* ================= ÁREA PRINCIPAL (CHAT) ================= */}
      <div 
        className={cn(
          "flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 relative",
          showChat ? "flex" : "hidden"
        )}
      >
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-card/80 backdrop-blur-md z-10 shadow-sm">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setSelectedConversation(null)}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                
                {(() => {
                   // Busca nos processados para manter consistência
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
                          {peer?.user_id && <UserLink userId={peer.user_id} username={peer.profiles?.username || ""} className="opacity-0 w-0 h-0 overflow-hidden" />}
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

            {/* Lista de Mensagens */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar overflow-x-hidden"
              style={{ overflowX: 'hidden' }}
            >
              {!isLoadingMessages && messages?.map((msg, idx) => {
                const isOwn = msg.user_id === user?.id;
                const showAvatar = !isOwn && (idx === 0 || messages[idx-1].user_id !== msg.user_id);
                const timerState = getMessageState(msg.id);

                // Verifica se é áudio
                const isAudio = msg.media_urls && msg.media_urls.some((url: string) => 
                  url.includes(".webm") || url.includes("audio")
                );

                // Se a mensagem foi deletada, não renderiza
                if (timerState?.status === 'deleted' || deletedMessages.has(msg.id)) {
                  return null;
                }

                return (
                  <div key={msg.id} className={cn("flex w-full gap-2", isOwn ? "justify-end" : "justify-start")}>
                    {!isOwn && (
                      <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                        {showAvatar ? (
                           <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.profiles?.avatar_url} />
                              <AvatarFallback className="text-[10px]">{msg.profiles?.username?.[0]}</AvatarFallback>
                           </Avatar>
                        ) : <div className="w-8" />}
                      </div>
                    )}

                    <div className={cn("flex flex-col max-w-[85%] sm:max-w-[70%] min-w-0", isOwn ? "items-end" : "items-start")}>
                      
                      {/* Indicador de Temporizador */}
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

                      {/* Conteúdo "UnDoInG" */}
                      {timerState?.status === 'showingUndoing' && (
                        <div className="px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg mb-2 animate-pulse">
                          <span className="text-destructive font-mono font-bold tracking-wider">
                            UnDoInG
                          </span>
                        </div>
                      )}

                      {/* Mídia */}
                      {msg.media_urls && msg.media_urls.length > 0 && timerState?.status !== 'showingUndoing' && (
                        <div className="mb-1 space-y-1 max-w-full">
                          {msg.media_urls.map((url: string, i: number) => {
                            if (isAudio) {
                              return (
                                <div key={i} className="max-w-full">
                                  <AudioPlayer 
                                    audioUrl={url} 
                                    className="bg-card border shadow-sm max-w-[250px] w-full" 
                                    onPlay={() => !isOwn && markAudioAsPlayed(msg.id)}
                                  />
                                  {/* Indicador de áudio não ouvido */}
                                  {!isOwn && !playedAudios.has(msg.id) && !timerState && (
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>Timer iniciará após ouvir</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <img 
                                key={i} 
                                src={url} 
                                alt="midia" 
                                className="rounded-lg max-h-[300px] max-w-full border shadow-sm w-auto object-cover bg-black/10" 
                                style={{ maxWidth: '100%' }}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Texto */}
                      {msg.content && timerState?.status !== 'showingUndoing' && (
                        <div 
                           className={cn(
                             "px-4 py-2 shadow-md text-sm relative group break-words min-w-[60px] max-w-full",
                             isOwn 
                               ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm" 
                               : "bg-card border text-foreground rounded-2xl rounded-tl-sm"
                           )}
                           style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          <div className="break-words overflow-hidden">
                            <MentionText text={timerState?.status === 'deleting' ? (timerState.currentText || '') : msg.content} />
                          </div>
                          <span className={cn(
                            "text-[10px] absolute bottom-1 right-3 opacity-60",
                            isOwn ? "text-primary-foreground" : "text-muted-foreground"
                          )}>
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {showScrollButton && (
               <Button 
                 size="icon" 
                 className="absolute bottom-24 right-6 rounded-full shadow-xl z-20 animate-in fade-in zoom-in duration-300" 
                 onClick={() => scrollToBottom(false)}
               >
                 <ArrowDown className="h-5 w-5" />
               </Button>
            )}

            {/* Input */}
            <div className="p-4 bg-background border-t">
               <div className="max-w-4xl mx-auto w-full">
                 <MessageInput
                   onSendMessage={handleSendMessage}
                   onAudioReady={handleAudioUpload}
                   onMediaReady={handleMediaUpload}
                   disabled={!selectedConversation}
                 />
               </div>
            </div>
          </>
        ) : (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
             <div className="w-32 h-32 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <MessageSquarePlus className="h-16 w-16 text-primary" />
             </div>
             <h1 className="text-3xl font-bold tracking-tight mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
               Suas Mensagens
             </h1>
             <p className="text-muted-foreground max-w-md mb-8 text-lg">
               Selecione uma conversa na barra lateral ou inicie um novo chat com seus amigos.
             </p>
             {!isMobile && (
               <div className="flex gap-4 text-sm text-muted-foreground/60">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Criptografado de ponta a ponta</span>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}