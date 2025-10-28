import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  MoreVertical,
  Phone,
  Video,
  UserPlus,
  MessageSquarePlus,
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

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Mark messages as viewed when user visits
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
        // Invalidar o contador imediatamente
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
  }, [selectedConversation, refetchConversations]); // manter refetch nas deps

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedConversation],
    enabled: !!selectedConversation,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          profiles:user_id (username, avatar_url)
        `
        )
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Auto scroll to bottom
  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      if (instant) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  };

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom(true);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages]);

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

    // Save mentions
    if (messageData) {
      const { saveMentions } = await import("@/utils/mentionsHelper");
      await saveMentions(messageData.id, "message", message, user.id);
    }

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
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;
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

    console.log("Iniciando chat com:", friendId);

    try {
      const { data: existingConv, error: convError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      console.log("Conversas existentes:", existingConv);

      if (convError) {
        console.error("Erro ao buscar conversas:", convError);
      }

      if (existingConv && existingConv.length > 0) {
        for (const conv of existingConv) {
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.conversation_id)
            .neq("user_id", user.id)
            .single();

          if (otherParticipant?.user_id === friendId) {
            console.log("Conversa encontrada:", conv.conversation_id);
            setSelectedConversation(conv.conversation_id);
            await refetchConversations();
            return;
          }
        }
      }

      console.log("Criando nova conversa...");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log("Session completa:", session);
      console.log("Session error:", sessionError);
      console.log("Access token:", session?.access_token ? "Present" : "Missing");
      console.log("User role:", session?.user?.role);

      const { data: newConv, error: createError } = await supabase
        .from("conversations")
        .insert({ is_group: false })
        .select()
        .single();

      console.log("Nova conversa:", newConv, "Erro:", createError);

      if (createError) {
        console.error("Erro ao criar conversa:", createError);
        toast({
          title: "Erro ao criar conversa",
          description: createError.message,
          variant: "destructive",
        });
        return;
      }

      if (!newConv) {
        console.error("Conversa não foi criada");
        return;
      }

      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: friendId },
        ]);

      console.log("Participantes adicionados, erro:", participantsError);

      if (participantsError) {
        toast({
          title: "Erro ao adicionar participantes",
          description: participantsError.message,
          variant: "destructive",
        });
        return;
      }

      setSelectedConversation(newConv.id);
      await refetchConversations();

      toast({
        title: "Chat iniciado!",
        description: "Agora você pode conversar",
      });

      console.log("Chat iniciado com sucesso!");
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  const filteredConversations = conversations?.filter((conv) =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ConversationsList = () => (
    <>
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Conversas</h2>
          <CreatePrivateRoom />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100%-90px)]">
        {filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => {
            const lastMessage = conversation.messages?.[0];
            const otherParticipant = conversation.conversation_participants?.find(
              (p: any) => p.user_id !== user?.id
            );

            return (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={cn(
                  "w-full p-4 flex items-center gap-3 hover:bg-accent transition-colors border-b",
                  selectedConversation === conversation.id && "bg-accent"
                )}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {otherParticipant?.profiles?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="truncate">
                    {otherParticipant?.user_id ? (
                      <UserLink
                        userId={otherParticipant.user_id}
                        username={otherParticipant.profiles?.username || ""}
                      >
                        {conversation.name ||
                          otherParticipant?.profiles?.username ||
                          "Usuário"}
                      </UserLink>
                    ) : (
                      <p className="font-medium">
                        {conversation.name || "Usuário"}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {lastMessage?.content || "Inicie uma conversa"}
                  </p>
                </div>
                {lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(lastMessage.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="bg-muted/50 rounded-full p-6 mb-4">
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Nenhuma conversa</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione contatos ao lado para iniciar conversas
            </p>
          </div>
        )}
      </div>
    </>
  );

  const ContactsPanel = () => (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Contatos</h2>
          <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Amigo</DialogTitle>
                <DialogDescription>
                  Use o código do amigo para adicionar
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
            className="pl-9"
          />
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-120px)]">
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="contacts">Amigos</TabsTrigger>
            <TabsTrigger value="requests">Pedidos</TabsTrigger>
          </TabsList>
          <TabsContent value="contacts" className="mt-4 px-4">
            <ContactsList onStartChat={startChatWithFriend} />
          </TabsContent>
          <TabsContent value="requests" className="mt-4 px-4">
            <FriendRequests />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );

  const ChatArea = () => (
    <>
      {selectedConversation ? (
        <>
          {/* Chat Header */}
          <div className="p-4 border-b bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden -ml-2"
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
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={otherParticipant?.profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {otherParticipant?.profiles?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div>
                        {otherParticipant?.user_id ? (
                          <UserLink
                            userId={otherParticipant.user_id}
                            username={otherParticipant.profiles?.username || ""}
                          >
                            {currentConv?.name ||
                              otherParticipant?.profiles?.username ||
                              "Usuário"}
                          </UserLink>
                        ) : (
                          <p className="font-medium">
                            {currentConv?.name || "Usuário"}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Online</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* AÇÕES (inclui o botão de atenção com cálculo local do peerId) */}
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
                    className="hidden sm:flex"
                  />
                );
              })()}

              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-muted/20">
            {messages && messages.length > 0 ? (
              messages.map((message: any) => {
                const isOwn = message.user_id === user?.id;
                const hasAudio = message.media_urls && message.media_urls.length > 0;

                return (
                  <div
                    key={message.id}
                    className={cn("flex gap-2", isOwn && "flex-row-reverse")}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={message.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white text-xs">
                        {message.profiles?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[75%] sm:max-w-[60%]")}>
                      {hasAudio ? (
                        <div className="space-y-2">
                          {message.media_urls.map((url: string, idx: number) => {
                            const isAudio =
                              url.includes(".webm") || url.includes("audio");
                            const isVideo =
                              url.match(/\.(mp4|mov|avi|webm)$/i) && !isAudio;
                            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                            if (isAudio) {
                              return (
                                <AudioPlayer
                                  key={idx}
                                  audioUrl={url}
                                  className={cn(
                                    isOwn &&
                                      "bg-gradient-to-r from-primary/10 to-secondary/10"
                                  )}
                                />
                              );
                            }

                            if (isImage) {
                              return (
                                <div
                                  key={idx}
                                  className="rounded-lg overflow-hidden max-w-sm"
                                >
                                  <img
                                    src={url}
                                    alt="Imagem"
                                    className="w-full h-auto select-none pointer-events-none"
                                    draggable={false}
                                    onContextMenu={(e) => e.preventDefault()}
                                  />
                                </div>
                              );
                            }

                            if (isVideo) {
                              return (
                                <div
                                  key={idx}
                                  className="rounded-lg overflow-hidden max-w-sm"
                                >
                                  <video
                                    src={url}
                                    controls
                                    className="w-full h-auto"
                                    preload="metadata"
                                  />
                                </div>
                              );
                            }

                            return null;
                          })}
                        </div>
                      ) : message.content ? (
                        <Card
                          className={cn(
                            "p-3",
                            isOwn
                              ? "bg-gradient-to-r from-primary to-secondary text-white border-0"
                              : "bg-card"
                          )}
                        >
                          <p className="text-sm break-words">
                            <MentionText text={message.content ?? ""} />
                          </p>
                        </Card>
                      ) : null}
                      <span
                        className={cn(
                          "text-xs text-muted-foreground mt-1 block",
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
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageSquarePlus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma mensagem ainda
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            onAudioReady={handleAudioSend}
            onMediaReady={handleMediaSend}
            disabled={!selectedConversation}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div className="max-w-sm">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full p-8 mb-4 inline-block">
              <MessageSquarePlus className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Bem-vindo!</h3>
            <p className="text-muted-foreground mb-6">
              Selecione uma conversa ou clique em um contato para começar a trocar mensagens
            </p>
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-background overflow-hidden">
        <div className="h-full flex">
          {/* Mobile view with just conversations or chat */}
          <div
            className={cn(
              "w-full border-r bg-card",
              selectedConversation && "hidden"
            )}
          >
            <ConversationsList />
            <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
              <DialogTrigger asChild>
                <Button
                  className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-10"
                  size="icon"
                >
                  <UserPlus className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contatos</DialogTitle>
                  <DialogDescription>
                    Gerencie seus contatos e amigos
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="contacts" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="contacts">Amigos</TabsTrigger>
                    <TabsTrigger value="requests">Pedidos</TabsTrigger>
                    <TabsTrigger value="add">Adicionar</TabsTrigger>
                  </TabsList>
                  <TabsContent value="contacts" className="mt-4">
                    <ContactsList onStartChat={startChatWithFriend} />
                  </TabsContent>
                  <TabsContent value="requests" className="mt-4">
                    <FriendRequests />
                  </TabsContent>
                  <TabsContent value="add" className="mt-4">
                    <AddFriend userCode={profile?.friend_code} />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          <div
            className={cn("w-full flex flex-col", !selectedConversation && "hidden")}
          >
            <ChatArea />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen bg-background overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        {/* Conversations Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full bg-card border-r flex flex-col">
            <ConversationsList />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Chat Area Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <ChatArea />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Contacts Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full bg-card border-l flex flex-col">
            <ContactsPanel />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
