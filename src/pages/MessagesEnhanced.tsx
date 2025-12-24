import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoreVertical, Trash2, Languages, Lock } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import AudioPlayer from "@/components/AudioPlayer";
import { translateText } from "@/services/translation";
import "@/styles/undoing.css";

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  created_at: string;
  detected_language: string | null;
  profiles?: { username?: string | null; avatar_url?: string | null } | null;
};

export default function MessagesEnhanced() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`*, conversation_participants!inner(user_id, profiles (username, avatar_url))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: deletions } = useQuery({
    queryKey: ["deletions", selectedConversation, user?.id],
    enabled: !!selectedConversation && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_deletions_user")
        .select("message_id")
        .eq("conversation_id", selectedConversation)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((d:any)=>d.message_id);
    },
  });

  const { data: messagesRaw, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedConversation],
    enabled: !!selectedConversation,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`*, profiles:user_id (username, avatar_url)`)
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
  });

  const deletionsSet = new Set(deletions || []);
  const messages = (messagesRaw || []).filter(m => !deletionsSet.has(m.id));

  const receiverId = useMemo(() => {
    if (!selectedConversation || !user?.id) return null;
    const conv: any = (conversations || []).find((c: any) => c.id === selectedConversation);
    const other = (conv?.conversation_participants || []).find((p: any) => p.user_id !== user.id);
    return other?.user_id || null;
  }, [conversations, selectedConversation, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages?.length]);

  const onSend = async (text: string) => {
    if (!selectedConversation || !user) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation,
      user_id: user.id,
      content: text,
    } as any);
    if (!error) refetchMessages();
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-6xl mx-auto h-full grid grid-cols-12 gap-4 p-4">
        <Card className="col-span-4 hidden md:flex flex-col">
          <div className="p-3 border-b flex gap-2"><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <div className="flex-1 overflow-auto">
            {(conversations||[])
              .filter((c:any)=> (c.name||"").toLowerCase().includes(search.toLowerCase()))
              .map((c:any)=>{
                const other = (c.conversation_participants||[]).find((p:any)=>p.user_id!==user?.id);
                return (
                  <button key={c.id} className={cn("w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50", selectedConversation===c.id && "bg-muted")}
                          onClick={()=>setSelectedConversation(c.id)}>
                    <Avatar><AvatarImage src={other?.profiles?.avatar_url||undefined} /><AvatarFallback>{other?.profiles?.username?.[0]?.toUpperCase()||"U"}</AvatarFallback></Avatar>
                    <div className="truncate">
                      <div className="font-semibold">{c.name || other?.profiles?.username || "Conversa"}</div>
                      <div className="text-xs text-muted-foreground">Criada em {new Date(c.created_at).toLocaleString()}</div>
                    </div>
                  </button>
                );
              })}
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-8 flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Selecione uma conversa</div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((m)=> <MessageBubble key={m.id} msg={m} currentUserId={user!.id} onDeleted={refetchMessages} />)}
                <div ref={endRef} />
              </div>
              <div className="border-t p-2">
                <ChatComposer onSend={onSend} receiverId={receiverId} />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function MessageBubble({ msg, currentUserId, onDeleted }:{ msg: Message, currentUserId: string, onDeleted: ()=>void }){
  const isOwn = msg.user_id === currentUserId;
  const [trans, setTrans] = useState<string|null>(null);
  const [srcLang, setSrcLang] = useState<string| null>(msg.detected_language || null);
  const [loadingTrans, setLoadingTrans] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [count, setCount] = useState(10);

  useEffect(()=>{
    if(!deleting) return;
    setCount(10);
    const iv = setInterval(()=> setCount(c => (c>0? c-1 : 0)), 1000);
    const t = setTimeout(async ()=>{
      await supabase.from("message_deletions_user").insert({
        message_id: msg.id,
        user_id: currentUserId,
        conversation_id: msg.conversation_id,
        original_content: msg.content,
        original_language: msg.detected_language
      } as any);
      onDeleted();
    }, 10000);
    return ()=> { clearInterval(iv); clearTimeout(t); };
  }, [deleting]);

  const handleTranslate = async ()=>{
    setLoadingTrans(true);
    try{
      const target = "pt"; // padrão
      const { translated, source_language } = await translateText(msg.content || "", target);
      setTrans(translated);
      setSrcLang(source_language || msg.detected_language || null);
    } finally {
      setLoadingTrans(false);
    }
  };

  return (
    <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={msg.profiles?.avatar_url||undefined} />
        <AvatarFallback>{msg.profiles?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[80%]")}>
        <div className={cn("rounded-2xl px-3 py-2 shadow-sm", isOwn ? "bg-primary/10" : "bg-muted")}>
          {deleting ? (
            <div className="flex items-center gap-2 undoing">
              <Lock className="h-4 w-4" />
              <span className="font-semibold tracking-wider">UnDoInG</span>
              <span className="text-xs opacity-70">({count}s)</span>
            </div>
          ) : (
            <>
              {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
              {Array.isArray(msg.media_urls) && msg.media_urls.map((url, idx) => {
                const isAudio = /\.webm|audio/.test(url);
                const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url) && !isAudio;
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                if (isAudio) return <AudioPlayer key={idx} audioUrl={url} />
                if (isVideo) return <video key={idx} src={url} controls className="mt-2 max-w-full rounded" />
                if (isImage) return <img key={idx} src={url} className="mt-2 max-w-full rounded" />
                return null;
              })}
            </>
          )}
        </div>
        {!deleting && (
          <div className={cn("flex items-center gap-2 text-xs mt-1", isOwn && "justify-end")}>
            <button className="opacity-70 hover:opacity-100 flex items-center gap-1" onClick={handleTranslate} disabled={loadingTrans}>
              <Languages className="h-3 w-3" /> {loadingTrans ? "Traduzindo..." : "Traduzir"}
            </button>
            <span>•</span>
            <button className="opacity-70 hover:opacity-100 flex items-center gap-1" onClick={()=>setDeleting(true)}>
              <Trash2 className="h-3 w-3" /> Excluir
            </button>
          </div>
        )}
        {trans && (
          <div className="mt-2 border-l-2 pl-3">
            <div className="text-[11px] uppercase tracking-wider opacity-60">Idioma de origem: {srcLang || "desconhecido"}</div>
            <div className="whitespace-pre-wrap translated-text">{trans}</div>
          </div>
        )}
      </div>
    </div>
  );
}