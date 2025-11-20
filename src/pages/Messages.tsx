import { useState, useEffect, useRef, useCallback } from "react";
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
  Lock,
} from "lucide-react";
import AttentionButton from "@/components/realtime/AttentionButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AddFriend from "@/components/AddFriend";
import ContactsList from "@/components/ContactsList";
import FriendRequests from "@/components/FriendRequests";
import AudioPlayer from "@/components/AudioPlayer";
import CreatePrivateRoom from "@/components/CreatePrivateRoom";
import { MessageInput } from "@/components/MessageInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { MentionText } from "@/components/MentionText";
import { Badge } from "@/components/ui/badge";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [activeContactsTab, setActiveContactsTab] = useState("contacts");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Estados de scroll simplificados
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // --- Helpers de scroll simplificados ---
  const scrollToBottom = useCallback((instant: boolean = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: instant ? "auto" : "smooth",
      });
    }
  }, []);

  const scrollToTop = useCallback((instant: boolean = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior: instant ? "auto" : "smooth",
      });
    }
  }, []);

  // Handler de scroll manual - CORRIGIDO
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    
    // Verifica se está no topo
    const atTop = scrollTop <= 10;
    
    // Verifica se está no fundo (com margem de tolerância)
    const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) <= 10;

    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom);
    setShowScrollToTop(scrollTop > 100);
  }, []);

  // Configura o observer do scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Atalhos de teclado
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isTyping) return;

      if (e.key === "End") {
        e.preventDefault();
        scrollToBottom(false);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToTop(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scrollToBottom, scrollToTop]);

  // Marca mensagens como vistas ao entrar
  useEffect(() => {
    if (!user) return;

    const markAsViewed = async () => {
      try {
        await supabase
          .from("last_viewed")
          .upsert(
            {
              user_id: user.id,
              section: "messages",
              viewed_at: new Date().toISOString(),
            },
            { onConflict: "user_id,section" }
          );
        queryClient.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      } catch (e) {
        console.warn("last_viewed network fail", e);
      }
    };

    markAsViewed();
  }, [user, queryClient]);

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

  const { data: conversations, refetch: refetchConversations } = useQuery({
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
          messages (content, created_at)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Query para mensagens não lidas
  const { data: unreadMessages } = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          user_id,
          created_at,
          conversations!inner(
            conversation_participants!inner(user_id)
          )
        `)
        .neq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const unreadCounts: { [conversationId: string]: number } = {};
      data?.forEach((message) => {
        if (!unreadCounts[message.conversation_id]) unreadCounts[message.conversation_id] = 0;
        unreadCounts[message.conversation_id]++;
      });

      return unreadCounts;
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    const messagesChannel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          refetchMessages();
          refetchConversations();
          queryClient.invalidateQueries({ queryKey: ["unread-messages", user?.id] });
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [selectedConversation, refetchConversations, queryClient, user?.id]);

  const { data: messages, refetch: refetchMessages } = useQuery({
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
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Scroll ao selecionar conversa - CORRIGIDO
  useEffect(() => {
    if (selectedConversation && messagesContainerRef.current) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        scrollToBottom(true);
        setIsAtBottom(true);
        setShowScrollToBottom(false);
        setShowScrollToTop(false);
      }, 100);
    }
  }, [selectedConversation, scrollToBottom]);

  // Scroll em novas mensagens - CORRIGIDO
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    
    if (isAtBottom) {
      setTimeout(() => {
        scrollToBottom(false);
      }, 50);
    } else {
      setShowScrollToBottom(true);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !selectedConversation || !user) return;

    const { data: messageData } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation,
        user_id: user.id,
        content: message,
      })
      .select()
      .single();

    if (messageData) {
      const { saveMentions } = await import("@/utils/mentionsHelper");
      await saveMentions(messageData.id, "message", message, user.id);
    }

    setTimeout(() => {
      if (isAtBottom) {
        scrollToBottom(true);
      }
    }, 50);

    refetchMessages();
  };

  const handleAudioSend = async (audioBlob: Blob) => {
    if (!selectedConversation || !user) return;

    try {
      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath);

      await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        user_id: user.id,
        media_urls: [publicUrl],
      });

      setTimeout(() => {
        if (isAtBottom) {
          scrollToBottom(true);
        }
      }, 50);

      refetchMessages();
      toast({ title: "Áudio enviado!" });
    } catch (error) {
      console.error("Error sending audio:", error);
      toast({ title: "Erro ao enviar áudio", variant: "destructive" });
    }
  };

  const handleMediaSend = async (files: File[]) => {
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

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath);

        return publicUrl;
      });

      const mediaUrls = await Promise.all(uploadPromises);

      await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        user_id: user.id,
        media_urls: mediaUrls,
      });

      setTimeout(() => {
        if (isAtBottom) {
          scrollToBottom(true);
        }
      }, 50);

      refetchMessages();
      toast({ title: "Mídia enviada!" });
    } catch (error) {
      console.error("Error sending media:", error);
      toast({ title: "Erro ao enviar mídia", variant: "destructive" });
    }
  };

  const startChatWithFriend = async (friendId: string) => {
    if (!user) {
      console.error("Usuário não autenticado");
      toast({
        title: "Erro",
        description: "Você precisa estar logado para iniciar um chat",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: existingConv } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingConv && existingConv.length > 0) {
        for (const conv of existingConv) {
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.conversation_id)
            .neq("user_id", user.id)
            .single();

          if (otherParticipant?.user_id === friendId) {
            setSelectedConversation(conv.conversation_id);
            setShowContactsModal(false);
            await refetchConversations();
            return;
          }
        }
      }

      const { data: newConv, error: createError } = await supabase
        .from("conversations")
        .insert({ is_group: false })
        .select()
        .single();

      if (createError) {
        toast({
          title: "Erro ao criar conversa",
          description: createError.message,
          variant: "destructive",
        });
        return;
      }

      if (!newConv) return;

      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: friendId },
        ]);

      if (participantsError) {
        toast({
          title: "Erro ao adicionar participantes",
          description: participantsError.message,
          variant: "destructive",
        });
        return;
      }

      setSelectedConversation(newConv.id);
      setShowContactsModal(false);
      await refetchConversations();

      toast({ title: "Chat iniciado!", description: "Agora você pode conversar" });
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      toast({ title: "Erro inesperado", description: "Tente novamente mais tarde", variant: "destructive" });
    }
  };

  const filteredConversations = conversations?.filter((conv) =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============ VERSÃO MOBILE ============
  const MobileContactsSection = () => (
    <div className="p-4 border-t border-muted/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Contatos</h3>
        </div>
        <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline"
              className="h-8"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Adicionar Amigo
              </DialogTitle>
              <DialogDescription>
                Use o código do amigo para adicionar à sua lista de contatos
              </DialogDescription>
            </DialogHeader>
            <AddFriend userCode={profile?.friend_code} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeContactsTab} onValueChange={setActiveContactsTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 mb-4">
          <TabsTrigger 
            value="contacts"
            className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all"
          >
            Amigos
          </TabsTrigger>
          <TabsTrigger 
            value="requests"
            className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all"
          >
            Pedidos
          </TabsTrigger>
          <TabsTrigger 
            value="add"
            className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all"
          >
            Adicionar
          </TabsTrigger>
        </TabsList>
        
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          <TabsContent value="contacts" className="mt-0">
            <ContactsList onStartChat={startChatWithFriend} />
          </TabsContent>
          <TabsContent value="requests" className="mt-0">
            <FriendRequests />
          </TabsContent>
          <TabsContent value="add" className="mt-0">
            <AddFriend userCode={profile?.friend_code} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );

  const MobileConversationsList = () => (
    <>
      <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20 space-y-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Conversas
            </h2>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20"
          />
        </div>
      </div>

      {/* Seção Salas Privadas */}
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Salas Privadas</h3>
          </div>
          {isMobile && <CreatePrivateRoom />}
        </div>
        <div className="overflow-y-auto max-h-64 custom-scrollbar">
          {filteredConversations && filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const lastMessage = conversation.messages?.[0];
              const otherParticipant = conversation.conversation_participants?.find(
                (p: any) => p.user_id !== user?.id
              );
              const unreadCount = unreadMessages?.[conversation.id] || 0;

              return (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-all duration-200 border-b border-muted/30 group",
                    selectedConversation === conversation.id && "bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-l-primary"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-background group-hover:ring-primary/20 transition-all">
                      <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold text-sm">
                        {otherParticipant?.profiles?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-background"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {conversation.name ||
                            otherParticipant?.profiles?.username ||
                            "Usuário"}
                        </p>
                        {otherParticipant?.user_id && (
                          <UserLink
                            userId={otherParticipant.user_id}
                            username={otherParticipant.profiles?.username || ""}
                          />
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs min-w-[18px] h-4 flex items-center justify-center">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {lastMessage?.content || "Inicie uma conversa"}
                    </p>
                  </div>
                  {lastMessage && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(lastMessage.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma sala encontrada</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seção de Contatos integrada diretamente */}
      <MobileContactsSection />
    </>
  );

  // ============ VERSÃO DESKTOP ============
  const DesktopConversationsList = () => (
    <>
      <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Conversas
            </h2>
          </div>
          <CreatePrivateRoom />
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100%-120px)] custom-scrollbar">
        {filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => {
            const lastMessage = conversation.messages?.[0];
            const otherParticipant = conversation.conversation_participants?.find(
              (p: any) => p.user_id !== user?.id
            );
            const unreadCount = unreadMessages?.[conversation.id] || 0;

            return (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={cn(
                  "w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-all duration-200 border-b border-muted/30 group",
                  selectedConversation === conversation.id && "bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-l-primary"
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                      {otherParticipant?.profiles?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background"></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">
                        {conversation.name ||
                          otherParticipant?.profiles?.username ||
                          "Usuário"}
                      </p>
                      {otherParticipant?.user_id && (
                        <UserLink
                          userId={otherParticipant.user_id}
                          username={otherParticipant.profiles?.username || ""}
                        />
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {lastMessage?.content || "Inicie uma conversa"}
                  </p>
                </div>
                {lastMessage && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(lastMessage.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </button>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center"></div>
        )}
      </div>
    </>
  );

  const DesktopContactsPanel = () => (
    <>
      <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Contatos
            </h2>
          </div>
          <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Adicionar Amigo
                </DialogTitle>
                <DialogDescription>
                  Use o código do amigo para adicionar à sua lista de contatos
                </DialogDescription>
              </DialogHeader>
              <AddFriend userCode={profile?.friend_code} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            value={contactsSearchQuery}
            onChange={(e) => setContactsSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20"
          />
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-140px)] custom-scrollbar">
        <Tabs defaultValue="contacts" className="w-full p-4">
          <TabsList className="w-full grid grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger 
              value="contacts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all"
            >
              Amigos
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all"
            >
              Pedidos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="contacts" className="mt-4">
            <ContactsList onStartChat={startChatWithFriend} />
          </TabsContent>
          <TabsContent value="requests" className="mt-4">
            <FriendRequests />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );

  // ============ CHAT AREA (COMUM) ============
  const ChatArea = () => (
    <>
      {selectedConversation ? (
        <div className="h-full flex flex-col relative">
          {/* Header */}
          <div className="p-4 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden -ml-2 hover:bg-accent/50"
                onClick={() => setSelectedConversation(null)}
              >
                ←
              </Button>
              {(() => {
                const currentConv = conversations?.find(
                  (c: any) => c.id === selectedConversation
                );
                const otherParticipant = currentConv?.conversation_participants?.find(
                  (p: any) => p.user_id !== user?.id
                );

                return (
                  <>
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                          {otherParticipant?.profiles?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {otherParticipant?.user_id ? (
                          <UserLink
                            userId={otherParticipant.user_id}
                            username={otherParticipant.profiles?.username || ""}
                            className="font-semibold text-lg hover:text-primary transition-colors"
                          >
                            {currentConv?.name ||
                              otherParticipant?.profiles?.username ||
                              "Usuário"}
                          </UserLink>
                        ) : (
                          <p className="font-semibold text-lg">
                            {currentConv?.name || "Usuário"}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Online agora
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center gap-1">
              {(() => {
                const peerId =
                  conversations
                    ?.find((c: any) => c.id === selectedConversation)
                    ?.conversation_participants
                    ?.find((p: any) => p.user_id !== user?.id)
                    ?.user_id;

                if (!peerId) return null;

                return (
                  <AttentionButton
                    contactId={peerId}
                    className="inline-flex hover:scale-110 transition-transform"
                  />
                );
              })()}

              <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/10">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/10">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages Container - CORRIGIDO */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-background to-muted/5 custom-scrollbar relative"
            style={{ minHeight: 0 }} // Importante para flexbox
          >
            <div className="max-w-4xl mx-auto p-4 space-y-4">
              {messages && messages.length > 0 ? (
                messages.map((message: any) => {
                  const isOwn = message.user_id === user?.id;
                  const hasAudio = message.media_urls && message.media_urls.length > 0;

                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-3 group", isOwn && "flex-row-reverse")}
                    >
                      {!isOwn && (
                        <Avatar className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AvatarImage src={message.profiles?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white text-xs">
                            {message.profiles?.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn("max-w-[75%] sm:max-w-[60%]", isOwn && "flex flex-col items-end")}>                        
                        {hasAudio ? (
                          <div className="space-y-2">
                            {message.media_urls.map((url: string, idx: number) => {
                              const isAudio = url.includes(".webm") || url.includes("audio");
                              const isVideo = url.match(/\.(mp4|mov|avi|webm)$/i) && !isAudio;
                              const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                              if (isAudio) {
                                return (
                                  <AudioPlayer
                                    key={idx}
                                    audioUrl={url}
                                    className={cn(
                                      "shadow-lg max-w-full",
                                      isOwn && "bg-gradient-to-r from-primary/10 to-secondary/10"
                                    )}
                                  />
                                );
                              }

                              if (isImage) {
                                return (
                                  <div key={idx} className="rounded-xl overflow-hidden max-w-sm shadow-lg border">
                                    <img
                                      src={url}
                                      alt="Imagem"
                                      className="w-full h-auto max-w-full select-none pointer-events-none transition-transform hover:scale-105"
                                      draggable={false}
                                      onContextMenu={(e) => e.preventDefault()}
                                    />
                                  </div>
                                );
                              }

                              if (isVideo) {
                                return (
                                  <div key={idx} className="rounded-xl overflow-hidden max-w-sm shadow-lg border">
                                    <video src={url} controls className="w-full h-auto max-w-full" preload="metadata" />
                                  </div>
                                );
                              }

                              return null;
                            })}
                          </div>
                        ) : message.content ? (
                          <Card
                            className={cn(
                              "p-4 shadow-sm border transition-all duration-200 max-w-full",
                              isOwn
                                ? "bg-gradient-to-r from-primary to-secondary text-white border-0 shadow-lg"
                                : "bg-card border-muted/50 shadow-md"
                            )}
                          >
                            <p className="text-sm break-words leading-relaxed max-w-full overflow-hidden">
                              <MentionText text={message.content ?? ""} />
                            </p>
                          </Card>
                        ) : null}
                        <span
                          className={cn(
                            "text-xs text-muted-foreground mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity",
                            isOwn ? "text-right" : "text-left"
                          )}
                        >
                          {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-center py-8">
                  <div className="max-w-md">
                    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full p-8 mb-4 inline-block">
                      <MessageSquarePlus className="h-16 w-16 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Conversa vazia</h3>
                    <p className="text-muted-foreground mb-4">Envie uma mensagem para iniciar a conversa</p>
                  </div>
                </div>
              )}
              {/* Marcador invisível no final */}
              <div ref={messagesEndRef} style={{ height: '1px', visibility: 'hidden' }} />
            </div>
          </div>

          {/* Botão flutuante para voltar ao fim */}
          {showScrollToBottom && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
              <Button
                onClick={() => {
                  scrollToBottom(false);
                  setShowScrollToBottom(false);
                }}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg"
                size="sm"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Ir para o final
              </Button>
            </div>
          )}

          {/* Botão flutuante para ir ao topo */}
          {showScrollToTop && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
              <Button
                onClick={() => {
                  scrollToTop(false);
                  setShowScrollToTop(false);
                }}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg"
                size="sm"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Ir para o topo
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="border-t bg-card/50 backdrop-blur-sm flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <MessageInput
                onSendMessage={handleSendMessage}
                onAudioReady={handleAudioSend}
                onMediaReady={handleMediaSend}
                disabled={!selectedConversation}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-center p-8 bg-gradient-to-br from-background to-muted/10">
          <div className="max-w-md">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-12 mb-6 inline-block shadow-lg">
              <MessageSquarePlus className="h-20 w-20 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Bem-vindo às Mensagens!
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              Selecione uma conversa ou clique em um contato para começar a trocar mensagens
            </p>
          </div>
        </div>
      )}
    </>
  );

  // ============ RENDERIZAÇÃO POR PLATAFORMA ============
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-background overflow-hidden">
        <div className="h-full flex">
          {/* Lista / Conversas */}
          <div className={cn("w-full border-r bg-card", selectedConversation && "hidden")}>
            <MobileConversationsList />
          </div>

          <div className={cn("w-full flex flex-col", !selectedConversation && "hidden")}>
            <ChatArea />
          </div>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen bg-background overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        {/* Painel de Conversas */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full bg-card border-r flex flex-col">
            <DesktopConversationsList />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Painel do Chat */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <ChatArea />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Painel de Contatos */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full bg-card border-l flex flex-col">
            <DesktopContactsPanel />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}