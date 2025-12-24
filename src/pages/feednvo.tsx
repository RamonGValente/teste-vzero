import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Share2, Zap, X, Image as ImageIcon,
  Mic, MapPin, Smile, MoreHorizontal, Search, Bell, Menu,
  User, Settings, Filter, Droplets, Wind, Flame, Layers,
  Activity, Radio, Fingerprint, Plus, ChevronUp, RefreshCw,
  Sparkles, AlignLeft, GripHorizontal
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

/* -------------------------------------------------------------------------- */
/* 1. BACKGROUND LÍQUIDO (ALTA PERFORMANCE CSS)                               */
/* -------------------------------------------------------------------------- */
const LiquidBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#08080a]">
      <style>{`
        @keyframes drift {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(100px, -50px) rotate(120deg) scale(1.1); }
          66% { transform: translate(-50px, 50px) rotate(240deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }
        @keyframes morph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }
        .blob {
          position: absolute;
          filter: blur(90px);
          opacity: 0.5;
          animation: drift 25s infinite linear, morph 15s infinite ease-in-out;
        }
      `}</style>
      
      {/* Elementos orgânicos de fundo */}
      <div className="blob bg-teal-600/40 w-[40rem] h-[40rem] -top-20 -left-20 animate-delay-0" />
      <div className="blob bg-indigo-600/40 w-[35rem] h-[35rem] top-1/2 right-0 animate-delay-2000" />
      <div className="blob bg-purple-600/30 w-[30rem] h-[30rem] bottom-0 left-1/3 animate-delay-4000" />
      
      {/* Camada de textura (Noise) para dar toque tátil */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. CARD BIO-DIGITAL (POST)                                                 */
/* -------------------------------------------------------------------------- */
const BioCard = ({ post, user, onLike }: { post: any, user: any, onLike: (id: string) => void }) => {
  const hasLiked = post.likes?.some((l: any) => l.user_id === user?.id);
  const [isHovered, setIsHovered] = useState(false);
  const likeCount = post.likes?.length || 0;

  // Extrair metadados de humor se existirem (formato simples de string parsing)
  const contentText = post.content || "";
  const moodMatch = contentText.match(/\[Mood: (.*?)\]/);
  const mood = moodMatch ? moodMatch[1] : null;
  const cleanContent = contentText.replace(/\[Mood: .*? \| Intensity: .*?\]\n\n/, "");

  return (
    <div 
      className="group relative mb-10 transition-all duration-500 ease-out hover:scale-[1.01]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Efeito de brilho externo ao passar o mouse */}
      <div className={cn(
        "absolute -inset-0.5 rounded-[2.5rem] bg-gradient-to-r from-teal-500/0 via-teal-500/0 to-purple-500/0 opacity-0 blur-xl transition duration-700",
        isHovered && "from-teal-500/30 via-blue-500/30 to-purple-500/30 opacity-100"
      )} />

      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        
        {/* Header do Card */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer group-hover:ring-2 ring-teal-500/50 rounded-full transition-all">
              <Avatar className="h-14 w-14 border border-white/20">
                <AvatarImage src={post.profiles?.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-black/50 text-white font-thin">
                  {post.profiles?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Indicador de Status Online (Simulado) */}
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)] border-2 border-[#1a1a1a]"></div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                @{post.profiles?.username}
                {mood && (
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border bg-opacity-20 uppercase tracking-widest font-bold",
                    mood === 'CALM' ? "border-teal-500 text-teal-300 bg-teal-500" :
                    mood === 'ENERGETIC' ? "border-orange-500 text-orange-300 bg-orange-500" :
                    "border-purple-500 text-purple-300 bg-purple-500"
                  )}>
                    {mood}
                  </span>
                )}
              </h3>
              <p className="text-xs font-medium text-white/40 uppercase tracking-widest flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • Bio-Signal
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" className="rounded-full text-white/40 hover:bg-white/10 hover:text-white">
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>

        {/* Conteúdo do Post */}
        <div className="px-8 py-2">
          <p className="text-xl leading-relaxed text-white/90 font-light whitespace-pre-wrap">
            {cleanContent}
          </p>
          
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mt-6 mb-2 overflow-hidden rounded-[1.5rem] border border-white/5 shadow-inner bg-black/20 relative group/media">
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity z-10" />
               <img 
                 src={post.media_urls[0]} 
                 alt="Conteúdo visual" 
                 className="h-full w-full object-cover max-h-[500px] transition-transform duration-1000 group-hover/media:scale-105" 
               />
               <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover/media:opacity-100 transition-opacity">
                 <Button size="icon" className="bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full">
                   <Sparkles className="h-4 w-4 text-white" />
                 </Button>
               </div>
            </div>
          )}
        </div>

        {/* Visualização Orgânica de Engajamento (Barra de Vida) */}
        <div className="relative h-1 w-full bg-white/5 mt-4">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(45,212,191,0.6)] transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(likeCount * 5, 100)}%` }} 
          />
        </div>

        {/* Barra de Ações (Glass Bottom) */}
        <div className="flex items-center justify-between bg-black/20 px-6 py-4 backdrop-blur-md border-t border-white/5">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onLike(post.id)}
              className={cn(
                "h-12 rounded-full border border-white/5 bg-white/5 px-5 transition-all hover:scale-105",
                hasLiked 
                  ? "border-teal-500/50 bg-teal-500/20 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]" 
                  : "text-white/60 hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-white"
              )}
            >
              <Zap className={cn("mr-2 h-5 w-5 transition-transform", hasLiked && "fill-current scale-110")} />
              <span className="font-bold text-lg">{likeCount}</span>
            </Button>
            
            <Button variant="ghost" className="h-12 rounded-full border border-white/5 bg-white/5 px-5 text-white/60 hover:bg-white/10 hover:text-white hover:scale-105 transition-all">
              <MessageCircle className="mr-2 h-5 w-5" />
              <span className="font-medium text-lg">{post.comments?.length || 0}</span>
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full border border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all hover:rotate-12">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. PAINEL DE SÍNTESE (NOVO SISTEMA DE CRIAÇÃO)                             */
/* -------------------------------------------------------------------------- */
const SynthesisPanel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState("");
  const [intensity, setIntensity] = useState([50]);
  const [mood, setMood] = useState<'calm' | 'energetic' | 'wild'>('calm');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handlePublish = async () => {
    if (!content.trim()) return;
    setIsSynthesizing(true);
    
    try {
      // Injeta os metadados no conteúdo (invisíveis para o usuário comum, mas parseados pelo Card)
      const enhancedContent = `[Mood: ${mood.toUpperCase()} | Intensity: ${intensity}%]\n\n${content}`;
      
      const { error } = await supabase.from("posts").insert({
        user_id: user?.id,
        content: enhancedContent,
        post_type: 'standard', // Mantém compatibilidade com tabela existente
        voting_period_active: true
      });

      if (error) throw error;
      
      // Invalida cache para atualizar feed instantaneamente
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      
      toast({
        title: "Sinal Transmitido",
        description: "Sua frequência foi integrada à rede com sucesso.",
        className: "bg-[#0a1a1a] border-teal-900 text-teal-100"
      });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha na Síntese", description: e.message });
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Overlay Escuro com Blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[3rem] border border-white/10 bg-[#0c0c10] shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header Dinâmico baseado no Mood */}
        <div className={cn(
          "h-40 w-full transition-all duration-700 relative overflow-hidden",
          mood === 'calm' ? "bg-gradient-to-br from-teal-900 via-emerald-900 to-black" :
          mood === 'energetic' ? "bg-gradient-to-br from-orange-900 via-red-900 to-black" :
          "bg-gradient-to-br from-purple-900 via-indigo-900 to-black"
        )}>
          {/* Efeitos de Fundo do Header */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
          <div className={cn(
            "absolute -right-10 -top-10 h-64 w-64 rounded-full blur-[60px] opacity-60 transition-colors duration-700",
            mood === 'calm' ? "bg-teal-500" : mood === 'energetic' ? "bg-orange-500" : "bg-purple-500"
          )} />

          <div className="relative z-10 flex h-full items-start justify-between px-10 pt-8">
            <div>
              <h2 className="text-4xl font-thin tracking-tighter text-white">
                Sintetizar <span className="font-bold">Sinal</span>
              </h2>
              <p className="text-white/60 mt-2 font-light">Selecione a frequência emocional da sua mensagem.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-black/20 text-white hover:bg-white/20 border border-white/5">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Área de Input */}
        <div className="px-8 py-6 bg-[#0c0c10]">
          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-black shadow-lg">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>EU</AvatarFallback>
              </Avatar>
              <div className="h-full w-[2px] bg-gradient-to-b from-white/10 to-transparent rounded-full"></div>
            </div>

            <div className="flex-1 space-y-8">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="O que está fluindo na sua mente agora?"
                className="min-h-[120px] resize-none border-none bg-transparent p-0 text-2xl text-white placeholder:text-white/20 focus-visible:ring-0 leading-relaxed font-light"
                autoFocus
              />
              
              {/* Painel de Controle de Vibe */}
              <div className="rounded-[2rem] bg-white/[0.03] border border-white/5 p-6 backdrop-blur-sm">
                
                {/* Seletor de Mood */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { id: 'calm', icon: Droplets, label: 'FLUXO', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
                    { id: 'energetic', icon: Flame, label: 'PULSO', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                    { id: 'wild', icon: Wind, label: 'CAOS', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMood(m.id as any)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold tracking-widest transition-all duration-300 border",
                        mood === m.id ? m.color : "bg-black/40 border-transparent text-white/30 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <m.icon className={cn("h-6 w-6 mb-1", mood === m.id && "animate-pulse")} />
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Slider de Intensidade */}
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold text-white/40 uppercase tracking-widest">
                    <span>Intensidade do Sinal</span>
                    <span>{intensity}%</span>
                  </div>
                  <Slider 
                    value={intensity} 
                    onValueChange={setIntensity} 
                    max={100} 
                    step={1}
                    className={cn(
                      "py-2",
                      "[&>.relative>.absolute]:bg-current",
                      mood === 'calm' ? "text-teal-500" : mood === 'energetic' ? "text-orange-500" : "text-purple-500"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer de Ação */}
        <div className="flex items-center justify-between border-t border-white/5 bg-black/40 px-10 py-6 backdrop-blur-md">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-teal-400 hover:bg-teal-500/10 rounded-xl">
              <ImageIcon className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-teal-400 hover:bg-teal-500/10 rounded-xl">
              <Mic className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-teal-400 hover:bg-teal-500/10 rounded-xl">
              <MapPin className="h-6 w-6" />
            </Button>
          </div>
          <Button 
            onClick={handlePublish}
            disabled={!content || isSynthesizing}
            className={cn(
              "rounded-full px-10 py-6 font-bold text-black transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]",
              isSynthesizing ? "bg-gray-500" : "bg-white hover:bg-gray-100"
            )}
          >
            {isSynthesizing ? (
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Radio className="h-5 w-5 mr-2" />
            )}
            {isSynthesizing ? "Sintetizando..." : "TRANSMITIR"}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. LAYOUT PRINCIPAL (BIO-FLOW FEED)                                        */
/* -------------------------------------------------------------------------- */
export default function BioFlowFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("stream");
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Efeito de scroll para transformar o header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Busca de Posts
  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          likes (id, user_id),
          comments (id)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleLike = async (postId: string) => {
    if (!user) return;
    
    // Atualização otimista local (opcional, mas recomendada para UX fluida)
    const post = posts?.find(p => p.id === postId);
    if (!post) return;
    const hasLiked = post.likes?.some((l: any) => l.user_id === user.id);

    if (hasLiked) {
      const likeId = post.likes.find((l: any) => l.user_id === user.id).id;
      await supabase.from("likes").delete().eq("id", likeId);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
    }
    
    refetch(); // Sincroniza com o servidor
  };

  return (
    <div className="min-h-screen w-full font-sans text-slate-200 selection:bg-teal-500/30 bg-[#08080a]">
      {/* Background Animado */}
      <LiquidBackground />

      {/* -------------------- HEADER FLUTUANTE -------------------- */}
      <header className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-500 ease-in-out border-b border-transparent",
        scrolled ? "bg-black/60 py-3 backdrop-blur-2xl border-white/5 shadow-2xl" : "bg-transparent py-8"
      )}>
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-6">
          
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-transform group-hover:rotate-12">
              <Fingerprint className="h-7 w-7 text-white" />
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-white leading-none">
                Bio<span className="font-thin text-teal-400">Flow</span>
              </span>
              <span className="text-[10px] text-white/40 font-medium tracking-[0.2em] uppercase">Rede Neural</span>
            </div>
          </div>

          {/* Seletor de Modo (Visível apenas em Desktop) */}
          <div className="hidden md:flex items-center gap-1 rounded-full bg-black/20 p-1.5 backdrop-blur-md border border-white/10 shadow-inner">
            {[
              { id: 'stream', icon: AlignLeft, label: 'Stream' },
              { id: 'grid', icon: GripHorizontal, label: 'Grid' },
              { id: 'zen', icon: Sparkles, label: 'Zen' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                  activeTab === tab.id
                    ? "bg-white text-black shadow-lg scale-105" 
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Perfil e Notificações */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-white/80 hover:bg-white/10 rounded-full h-12 w-12 border border-transparent hover:border-white/10">
              <Bell className="h-6 w-6" />
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
            </Button>
            <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-transparent transition-all hover:ring-teal-400 hover:scale-105">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-gray-800 to-black text-white border border-white/20">EU</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* -------------------- CONTEÚDO PRINCIPAL -------------------- */}
      <main className="relative z-10 container mx-auto max-w-2xl px-4 pt-40 pb-40">
        
        {/* Trigger de Criação (Barra de Status) */}
        <div 
          onClick={() => setShowSynthesis(true)}
          className="mb-14 flex cursor-pointer items-center gap-5 rounded-[2.5rem] border border-white/10 bg-gradient-to-r from-white/5 to-transparent p-5 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-teal-500/30 group shadow-lg"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 group-hover:bg-teal-400 group-hover:text-black transition-colors">
            <Plus className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-light text-white/90 group-hover:text-white transition-colors">Iniciar Transmissão...</p>
            <p className="text-xs text-white/40 tracking-widest uppercase mt-1 group-hover:text-teal-400 transition-colors">Toque para sintetizar</p>
          </div>
          <div className="mr-4">
            <Activity className="h-6 w-6 text-white/20 group-hover:text-teal-400 transition-colors" />
          </div>
        </div>

        {/* Filtros de Conteúdo (Scroll Horizontal) */}
        <ScrollArea className="mb-10 w-full whitespace-nowrap pb-2">
          <div className="flex gap-4 px-1">
            {[
              { label: 'Todos os Sinais', icon: Layers, active: true },
              { label: 'Alta Frequência', icon: Zap, active: false },
              { label: 'Visual', icon: ImageIcon, active: false },
              { label: 'Sonoro', icon: Mic, active: false },
              { label: 'Local', icon: MapPin, active: false },
            ].map((filter, i) => (
              <button
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-6 py-3 text-sm font-bold tracking-wide transition-all duration-300 hover:scale-105",
                  filter.active 
                    ? "border-teal-500/50 bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]" 
                    : "border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                <filter.icon className="h-4 w-4" />
                {filter.label}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* FEED DE POSTS */}
        <div className="space-y-4 min-h-[50vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <RefreshCw className="h-10 w-10 text-teal-500 animate-spin" />
               <p className="text-white/40 animate-pulse uppercase tracking-widest text-xs">Sincronizando Rede...</p>
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => (
              <BioCard 
                key={post.id} 
                post={post} 
                user={user} 
                onLike={handleLike} 
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-white/20 border border-dashed border-white/10 rounded-[3rem]">
              <Radio className="mb-6 h-20 w-20 opacity-20" />
              <p className="text-xl font-light">Nenhum sinal detectado</p>
              <Button variant="link" onClick={() => setShowSynthesis(true)} className="text-teal-400 mt-2">
                Seja o primeiro a transmitir
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* -------------------- DOCK DE NAVEGAÇÃO (ESTILO MACOS) -------------------- */}
      <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-end gap-3 rounded-[2rem] border border-white/10 bg-black/60 p-3 shadow-2xl backdrop-blur-2xl px-6">
          {[
            { id: 'home', icon: Layers, label: 'Feed' },
            { id: 'search', icon: Search, label: 'Busca' },
            { id: 'add', icon: Plus, label: 'Criar', highlight: true },
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'profile', icon: User, label: 'Perfil' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'add' ? setShowSynthesis(true) : null}
              className={cn(
                "group relative flex items-center justify-center rounded-[1.5rem] transition-all duration-300 hover:-translate-y-2 hover:scale-110",
                item.highlight 
                  ? "h-16 w-16 bg-white text-black hover:bg-teal-50 shadow-[0_0_20px_rgba(255,255,255,0.3)] mx-2" 
                  : "h-12 w-12 text-white/50 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn("transition-transform", item.highlight ? "h-8 w-8" : "h-6 w-6")} />
              
              {/* Tooltip */}
              <span className="absolute -top-12 scale-0 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 text-xs font-bold text-white transition-all group-hover:scale-100 whitespace-nowrap">
                {item.label}
              </span>
              
              {/* Ponto indicador de ativo (Simulado para Home) */}
              {item.id === 'home' && (
                 <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-teal-400"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Modais e Overlays */}
      {showSynthesis && <SynthesisPanel onClose={() => setShowSynthesis(false)} />}
    </div>
  );
}