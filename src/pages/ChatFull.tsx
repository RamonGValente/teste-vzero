import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Languages } from "lucide-react";
import { ContactsSidebar } from "@/components/chat/ContactsSidebar";
import ChatComposer from "@/components/chat/ChatComposer";
import AudioPlayer from "@/components/AudioPlayer";
import { translateText } from "@/services/translation";
import CreatePrivateRoom from "@/components/CreatePrivateRoom";
import "@/styles/undoing.css";

type ProfileMini = { username?: string | null; avatar_url?: string | null };
type Conversation = {
  id: string;
  name: string | null;
  created_at: string;
  conversation_participants?: { user_id: string; profiles?: ProfileMini | null }[];
};
type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  created_at: string;
  detected_language: string | null;
  profiles?: ProfileMini | null;
};

export default function ChatFull() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`*, conversation_participants!inner(user_id, profiles (username, avatar_url))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Conversation[];
    },
  });

  useEffect(() => {
    if (!selectedId && conversations && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  return (
    <div className="h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto h-full grid grid-cols-12 gap-4 p-4 max-w-6xl">
        {/* Contatos + Criar sala */}
        <Card className="col-span-4 hidden md:flex">
          <ContactsSidebar
            userId={user?.id}
            conversations={conversations || []}
            search={search}
            setSearch={setSearch}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenCreateRoom={() => setOpenCreate(true)}
          />
        </Card>

        {/* Área do chat */}
        <Card className="col-span-12 md:col-span-8 flex flex-col">
          <ChatArea conversationId={selectedId} />
        </Card>
      </div>

      {/* Modal de sala privada (usa o seu componente existente) */}
      <CreatePrivateRoom open={openCreate} onOpenChange={setOpenCreate} />
    </div>
  );
}

function ChatArea({ conversationId }: { conversationId: string | null }) {
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);
  const [transMap, setTransMap] = useState<Record<string, { text: string; src?: string }>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [countdown, setCountdown] = useState<Record<string, number>>({});

  const { data: deletions } = useQuery({
    queryKey: ["deletions", conversationId, user?.id],
    enabled: !!conversationId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_deletions_user")
        .select("message_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((d: any) => d.message_id) as string[];
    },
  });

  const { data: messagesRaw, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`*, profiles:user_id (username, avatar_url)`)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any as Message[];
    },
  });

  // Para chats privados: identifica o outro participante (destinatário) para habilitar "Chamar atenção" dentro do chat
  const { data: participants } = useQuery({
    queryKey: ["chat_participants", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);
      if (error) throw error;
      return (data || []) as { user_id: string }[];
    },
  });

  const receiverId = useMemo(() => {
    if (!user?.id || !participants?.length) return null;
    const others = participants.map((p) => p.user_id).filter((id) => id && id !== user.id);
    return others.length === 1 ? others[0] : null;
  }, [participants, user?.id]);

  const hidden = new Set(deletions || []);
  const messages = (messagesRaw || []).filter((m) => !hidden.has(m.id));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, conversationId]);

  const onSend = async (text: string) => {
    if (!conversationId || !user) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      content: text,
    } as any);
    if (!error) refetchMessages();
  };

  const doTranslate = async (m: Message) => {
    const { translated, source_language } = await translateText(m.content || "", "pt");
    setTransMap((prev) => ({ ...prev, [m.id]: { text: translated, src: source_language || m.detected_language || "auto" } }));
  };

  const doDelete = async (m: Message) => {
    setDeleting((prev) => ({ ...prev, [m.id]: true }));
    setCountdown((prev) => ({ ...prev, [m.id]: 10 }));

    const tick = () => setCountdown((prev) => ({ ...prev, [m.id]: Math.max(0, (prev[m.id] || 0) - 1) }));
    const iv = setInterval(tick, 1000);
    setTimeout(async () => {
      clearInterval(iv);
      await supabase.from("message_deletions_user").insert({
        message_id: m.id,
        conversation_id: m.conversation_id,
        user_id: user!.id,
        original_content: m.content,
        original_language: m.detected_language,
      } as any);
      setDeleting((prev) => ({ ...prev, [m.id]: false }));
      await refetchMessages();
    }, 10000);
  };

  if (!conversationId) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Selecione uma conversa</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages?.map((m) => {
          const isOwn = m.user_id === user?.id;
          const isDeleting = !!deleting[m.id];
          const c = countdown[m.id] ?? 0;
          return (
            <div key={m.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={m.profiles?.avatar_url || undefined} />
                <AvatarFallback>{(m.profiles?.username?.[0] || "U").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="max-w-[80%]">
                <div className={cn("rounded-2xl px-3 py-2 shadow-sm", isOwn ? "bg-primary/10" : "bg-muted")}>
                  {isDeleting ? (
                    <div className="flex items-center gap-2 undoing">
                      <span className="font-semibold tracking-wider">UnDoInG</span>
                      <span className="text-xs opacity-70">({c}s)</span>
                    </div>
                  ) : (
                    <>
                      {!!m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                      {Array.isArray(m.media_urls) &&
                        m.media_urls.map((url, idx) => {
                          const isAudio = /\.webm|audio/.test(url);
                          const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url) && !isAudio;
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                          if (isAudio) return <AudioPlayer key={idx} audioUrl={url} />;
                          if (isVideo) return <video key={idx} src={url} controls className="mt-2 max-w-full rounded" />;
                          if (isImage) return <img key={idx} src={url} className="mt-2 max-w-full rounded" />;
                          return null;
                        })}
                    </>
                  )}
                </div>
                {!isDeleting && (
                  <div className={cn("flex items-center gap-2 text-xs mt-1", isOwn && "justify-end")}>
                    <button className="opacity-70 hover:opacity-100 flex items-center gap-1" onClick={() => doTranslate(m)}>
                      <Languages className="h-3 w-3" /> Traduzir
                    </button>
                    <span>•</span>
                    <button className="opacity-70 hover:opacity-100 flex items-center gap-1" onClick={() => doDelete(m)}>
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                )}
                {transMap[m.id] && (
                  <div className="mt-2 border-l-2 pl-3">
                    <div className="text-[11px] uppercase tracking-wider opacity-60">
                      Idioma de origem: {transMap[m.id].src || "desconhecido"}
                    </div>
                    <div className="whitespace-pre-wrap translated-text">{transMap[m.id].text}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t p-2">
        <ChatComposer onSend={onSend} receiverId={receiverId} />
      </div>
    </div>
  );
}