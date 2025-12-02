import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, Bomb, X, Pencil, Trash2,
  Camera, Video, Maximize2, Minimize2, Images, RotateCcw, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Users, Sparkles, Wand2,
  Palette, Sun, Moon, Monitor, Zap, Skull, Film, Music, Baby, Brush, PenTool, Ghost, Smile,
  Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MentionText } from "@/components/MentionText";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress"; 

/* ---------- COMPONENTE: Timer de Votação (Otimizado) ---------- */
const VotingCountdown = ({ endsAt, onExpire, variant = "default" }: { endsAt: string; onExpire?: () => void, variant?: "default" | "flash" }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const end = new Date(endsAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Encerrado");
        if (onExpire) onExpire();
        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  if (isExpired) return <span className="text-xs font-bold opacity-70">Processando...</span>;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold animate-pulse",
      variant === "flash" ? "bg-black/50 text-white border border-white/20" : "bg-orange-100 text-orange-700"
    )}>
      <Clock className="h-3 w-3" />
      <span>{timeLeft}</span>
    </div>
  );
};

/* ---------- COMPONENTE: Imagem Progressiva (Lazy + Blur-up) ---------- */
const ProgressiveImage = ({ src, alt, className, onClick }: { src: string, alt: string, className?: string, onClick?: () => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className={cn("relative overflow-hidden bg-muted/30", className)} onClick={onClick}>
      {/* Placeholder borrado para UX imediata */}
      <img 
        src={src} 
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full object-cover filter blur-xl scale-110 transition-opacity duration-700",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        aria-hidden="true"
      />
      {/* Imagem Real com Lazy Loading */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          "relative w-full h-full object-cover transition-all duration-700",
          isLoaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-sm scale-105"
        )}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

/* ---------- Configurações de Estilo IA (Presets Otimizados) ---------- */
const AI_STYLES = [
  { id: 'rejuvenate', label: 'Rejuvenescer', icon: Baby, color: 'bg-green-100 text-green-600', prompt: 'make them look 20 years younger, remove deep wrinkles, face lift, glowing youthful skin, high fidelity, 8k, soft studio lighting', filter: 'rejuvenate' },
  { id: 'beauty', label: 'Embelezar', icon: Sparkles, color: 'bg-pink-100 text-pink-600', prompt: 'high quality, beautified, perfect lighting, 8k, smooth skin, makeup, glamour', filter: 'beauty' },
  { id: 'hdr', label: 'HDR / Nitidez', icon: Sun, color: 'bg-orange-100 text-orange-600', prompt: 'hdr, high contrast, sharp focus, detailed, hyperrealistic, 4k', filter: 'hdr' },
  { id: 'oil', label: 'Pintura a Óleo', icon: Brush, color: 'bg-yellow-100 text-yellow-700', prompt: 'oil painting style, van gogh style, thick brushstrokes, artistic, masterpiece', filter: 'oil' },
  { id: 'cartoon', label: 'Cartoon 3D', icon: Smile, color: 'bg-blue-50 text-blue-500', prompt: '3d pixar style character, cute, big eyes, disney style, smooth render', filter: 'cartoon' },
  { id: 'sketch', label: 'Esboço', icon: PenTool, color: 'bg-stone-100 text-stone-600', prompt: 'pencil sketch, charcoal drawing, rough lines, black and white sketch', filter: 'sketch' },
  { id: 'fantasy', label: 'Fantasia', icon: Ghost, color: 'bg-indigo-100 text-indigo-600', prompt: 'fantasy art, magical atmosphere, glowing lights, ethereal, dreamlike', filter: 'fantasy' },
  { id: 'bw', label: 'Preto & Branco', icon: Moon, color: 'bg-gray-100 text-gray-600', prompt: 'black and white photography, artistic, monochrome, noir film', filter: 'bw' },
  { id: 'vintage', label: 'Vintage 1950', icon: Film, color: 'bg-amber-100 text-amber-700', prompt: 'vintage photo, 1950s style, sepia, grain, old photo texture', filter: 'vintage' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, color: 'bg-purple-100 text-purple-600', prompt: 'cyberpunk style, neon lights, magenta and cyan, futuristic, scifi city', filter: 'cyberpunk' },
  { id: 'matrix', label: 'Matrix', icon: Monitor, color: 'bg-emerald-100 text-emerald-600', prompt: 'matrix code style, green tint, hacker atmosphere, digital rain', filter: 'matrix' },
  { id: 'anime', label: 'Anime', icon: Palette, color: 'bg-blue-100 text-blue-600', prompt: 'anime style, vibrant colors, 2d animation style, japanese animation', filter: 'anime' },
  { id: 'terror', label: 'Terror', icon: Skull, color: 'bg-red-100 text-red-600', prompt: 'horror style, dark atmosphere, scary, zombie apocalypse, blood', filter: 'terror' },
  { id: 'cold', label: 'Frio / Inverno', icon: Music, color: 'bg-cyan-100 text-cyan-600', prompt: 'cold atmosphere, winter, blue tones, ice, snow', filter: 'cold' },
];

/* ---------- NOVO COMPONENTE: Carrossel Flash ---------- */
interface FlashCarouselProps {
  posts: any[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  user: any;
  handleLike: (postId: string) => void;
  handleVote: (postId: string, type: "heart" | "bomb") => void;
}

const FlashCarousel = ({ 
  posts, 
  currentIndex, 
  setCurrentIndex, 
  user,
  handleLike,
  handleVote
}: FlashCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null);
  const { toast } = useToast();

  // Configura Intersection Observer para verificar visibilidade
  useEffect(() => {
    if (!carouselRef.current) return;

    visibilityObserverRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        
        // Se o carrossel saiu da tela, pausa o áudio
        if (!entry.isIntersecting && currentAudioRef.current && !currentAudioRef.current.paused) {
          currentAudioRef.current.pause();
        }
        
        // Se o carrossel voltou para a tela e o áudio está habilitado, retoma
        if (entry.isIntersecting && isAudioEnabled && currentAudioRef.current) {
          const currentPost = posts[currentIndex];
          if (currentPost?.audio_url) {
            currentAudioRef.current.play().catch(console.error);
          }
        }
      },
      {
        threshold: 0.5, // Quando 50% do elemento está visível
        rootMargin: '0px'
      }
    );

    visibilityObserverRef.current.observe(carouselRef.current);

    return () => {
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
      }
    };
  }, [posts, currentIndex, isAudioEnabled]);

  // Configura autoplay para passar os posts a cada 5 segundos
  useEffect(() => {
    if (posts.length <= 1 || !isVisible) return;
    
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % posts.length);
    }, 5000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [posts.length, setCurrentIndex, isVisible]);

  // Para o áudio quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, []);

  const nextPost = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    setCurrentIndex((currentIndex + 1) % posts.length);
    resetAutoPlay();
  };

  const prevPost = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    setCurrentIndex((currentIndex - 1 + posts.length) % posts.length);
    resetAutoPlay();
  };

  const resetAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    if (isVisible) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % posts.length);
      }, 5000);
    }
  };

  const handleFlashAudio = (audioUrl: string) => {
    const cleanUrl = audioUrl.replace(/^audio::/, "");
    
    if (!isAudioEnabled) {
      // Se áudio está desabilitado, apenas habilita
      setIsAudioEnabled(true);
      toast({
        title: "Áudio habilitado",
        description: "O áudio será reproduzido automaticamente nos posts visíveis",
      });
      
      // Se o carrossel está visível, inicia a reprodução
      if (isVisible) {
        const currentPost = posts[currentIndex];
        if (currentPost?.audio_url === audioUrl) {
          const audio = new Audio(cleanUrl);
          currentAudioRef.current = audio;
          
          audio.play().catch(error => {
            console.error("Erro ao reproduzir áudio:", error);
            toast({
              variant: "destructive",
              title: "Erro no áudio",
              description: "Não foi possível reproduzir o áudio",
            });
          });
          
          audio.onended = () => {
            currentAudioRef.current = null;
          };
        }
      }
      return;
    }

    // Se áudio já está tocando, pausa
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsAudioEnabled(false);
      toast({
        title: "Áudio desabilitado",
        description: "O áudio foi pausado em todos os posts",
      });
    } else {
      // Inicia novo áudio apenas se estiver visível
      if (!isVisible) {
        toast({
          title: "Áudio não disponível",
          description: "O post precisa estar visível para reproduzir áudio",
        });
        return;
      }
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      
      const audio = new Audio(cleanUrl);
      currentAudioRef.current = audio;
      
      audio.play().catch(error => {
        console.error("Erro ao reproduzir áudio:", error);
        toast({
          variant: "destructive",
          title: "Erro no áudio",
          description: "Não foi possível reproduzir o áudio",
        });
      });
      
      audio.onended = () => {
        currentAudioRef.current = null;
      };
    }
  };

  // Reproduz áudio automaticamente quando habilitado, mudar de post e estiver visível
  useEffect(() => {
    if (isAudioEnabled && isVisible) {
      const currentPost = posts[currentIndex];
      if (currentPost?.audio_url) {
        const cleanUrl = currentPost.audio_url.replace(/^audio::/, "");
        
        // Pausa áudio anterior
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
        }
        
        // Inicia novo áudio
        const audio = new Audio(cleanUrl);
        currentAudioRef.current = audio;
        
        audio.play().catch(error => {
          console.error("Erro ao reproduzir áudio automaticamente:", error);
        });
        
        audio.onended = () => {
          currentAudioRef.current = null;
        };
      }
    }
    
    // Limpeza ao mudar de post
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, [currentIndex, posts, isAudioEnabled, isVisible]);

  const currentPost = posts[currentIndex];
  const img = currentPost?.media_urls?.[0] ? currentPost.media_urls[0].replace(/^image::|^video::|^audio::/, "") : null;
  const isVoting = currentPost?.voting_period_active;
  const heartCount = currentPost?.post_votes?.filter((v:any) => v.vote_type === 'heart').length || 0;
  const bombCount = currentPost?.post_votes?.filter((v:any) => v.vote_type === 'bomb').length || 0;
  const totalVotes = heartCount + bombCount;
  const approvalRate = totalVotes > 0 ? (heartCount / totalVotes) * 100 : 50;
  const isLiked = currentPost?.likes?.some((like: any) => like.user_id === user?.id);
  const userVote = currentPost?.post_votes?.find((v:any) => v.user_id === user?.id);

  return (
    <div ref={carouselRef} className="relative mb-6">
      {/* Título da seção Flash */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Volume2 className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Flash Posts</h3>
          {/* Indicador de status do áudio */}
          <Badge variant={isAudioEnabled ? "default" : "outline"} className="ml-2">
            {isAudioEnabled ? (
              <>
                <Volume2 className="h-3 w-3 mr-1" />
                Áudio Ativo
              </>
            ) : (
              <>
                <VolumeX className="h-3 w-3 mr-1" />
                Áudio Inativo
              </>
            )}
          </Badge>
          {/* Indicador de visibilidade (apenas para debug) */}
          <Badge variant="outline" className="ml-2">
            {isVisible ? "🟢 Visível" : "🔴 Fora da tela"}
          </Badge>
        </div>
        
        {/* Indicador de posts */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevPost}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {currentIndex + 1} / {posts.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextPost}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carrossel principal */}
      <div className="relative">
        <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-gray-900 to-black">
          <div className="aspect-[4/5] max-h-[500px] relative">
            {/* Imagem do post */}
            {img && (
              <img
                src={img}
                alt="Flash post"
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Overlay gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            {/* Controles superiores */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-white/50">
                  <AvatarImage src={currentPost?.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary">
                    {currentPost?.profiles?.username?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <UserLink 
                    userId={currentPost?.user_id} 
                    username={currentPost?.profiles?.username || ''}
                    className="font-bold text-white text-sm"
                  >
                    {currentPost?.profiles?.username}
                  </UserLink>
                  <p className="text-xs text-white/70">
                    {new Date(currentPost?.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              {isVoting && <VotingCountdown endsAt={currentPost.voting_ends_at} variant="flash" />}
            </div>

            {/* Controles inferiores */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Área de votação (se estiver em votação) */}
              {isVoting ? (
                <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Bomb className="h-4 w-4 text-red-500" />
                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${approvalRate}%` }} 
                        className="h-full bg-green-500 transition-all duration-500" 
                      />
                      <div 
                        style={{ width: `${100 - approvalRate}%` }} 
                        className="h-full bg-red-500 transition-all duration-500" 
                      />
                    </div>
                    <Heart className="h-4 w-4 text-green-500 fill-green-500" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className={cn(
                        "flex-1 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm",
                        userVote?.vote_type === 'bomb' && 
                        "bg-red-500/50 hover:bg-red-500/60"
                      )}
                      onClick={() => handleVote(currentPost.id, "bomb")}
                    >
                      <Bomb className="mr-2 h-4 w-4" />
                      Bomb ({bombCount})
                    </Button>
                    <Button
                      size="sm"
                      className={cn(
                        "flex-1 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm",
                        userVote?.vote_type === 'heart' && 
                        "bg-green-500/50 hover:bg-green-500/60"
                      )}
                      onClick={() => handleVote(currentPost.id, "heart")}
                    >
                      <Heart className="mr-2 h-4 w-4 fill-current" />
                      Heart ({heartCount})
                    </Button>
                  </div>
                </div>
              ) : (
                /* Área normal com interações */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLike(currentPost?.id)}
                      className={cn(
                        "rounded-full text-white hover:bg-white/20",
                        isLiked && "text-red-500"
                      )}
                    >
                      <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-white hover:bg-white/20"
                    >
                      <MessageCircle className="h-6 w-6" />
                    </Button>
                    
                    {/* Botão de áudio */}
                    {currentPost?.audio_url && (
                      <Button
                        variant={isAudioEnabled ? "default" : "ghost"}
                        size="icon"
                        onClick={() => handleFlashAudio(currentPost.audio_url)}
                        className={cn(
                          "rounded-full",
                          isAudioEnabled ? "bg-primary text-white" : "text-white hover:bg-white/20"
                        )}
                      >
                        {isAudioEnabled ? (
                          <Volume2 className="h-6 w-6" />
                        ) : (
                          <VolumeX className="h-6 w-6" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-white hover:bg-white/20"
                  >
                    <Bookmark className="h-6 w-6" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Miniaturas dos próximos posts */}
        {posts.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {posts.slice(0, 5).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                  }
                  setCurrentIndex(index);
                  resetAutoPlay();
                }}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentIndex ? "bg-primary w-8" : "bg-gray-300 w-2 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Helpers ---------- */
const MEDIA_PREFIX = { image: "image::", video: "video::", audio: "audio::" } as const;
const isVideoUrl = (u: string) => u.startsWith(MEDIA_PREFIX.video) || /\.(mp4|webm|ogg|mov|m4v)$/i.test(u.split("::").pop() || u);
const isAudioUrl = (u: string) => u.startsWith(MEDIA_PREFIX.audio) || /\.(mp3|wav|ogg|m4a)$/i.test(u.split("::").pop() || u);
const stripPrefix = (u: string) => u.replace(/^image::|^video::|^audio::/, "");
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function getMediaDurationSafe(file: File, timeoutMs = 4000): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(file);
    const media = file.type.startsWith("video/") ? document.createElement("video") : document.createElement("audio");
    media.preload = "metadata";
    const done = (sec: number) => { if (settled) return; settled = true; URL.revokeObjectURL(url); resolve(sec); };
    const timer = setTimeout(() => done(0), timeoutMs);
    media.onloadedmetadata = () => { clearTimeout(timer); done(isFinite(media.duration) ? media.duration : 0); };
    media.onerror = () => { clearTimeout(timer); done(0); };
    media.src = url;
  });
}

async function compressImage(file: File, maxSize = 1440, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const { canvas, ctx, w, h } = createCanvasToFit(img, maxSize);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  const name = (file.name.split(".")[0] || "image") + "-compressed.jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function createCanvasToFit(img: HTMLImageElement, maxSide: number) {
  let w = img.width;
  let h = img.height;
  if (Math.max(w, h) > maxSide) {
    const scale = maxSide / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx, w, h };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((res) => canvas.toBlob(b => res(b!), type, quality));
}

/* ---------- Hooks ---------- */
type PostRow = any;
type VoteUser = { id: string; username: string; avatar_url: string; vote_type: "heart" | "bomb" };

const useVideoAutoPlayer = () => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const playVideo = useCallback(async (videoId: string) => {
    const video = videoRefs.current.get(videoId);
    if (video && playingVideo !== videoId) {
      try {
        if (playingVideo) videoRefs.current.get(playingVideo)?.pause();
        setPlayingVideo(videoId);
        video.muted = muted;
        await video.play();
      } catch (e) {}
    }
  }, [playingVideo, muted]);

  const pauseVideo = useCallback((videoId: string) => {
    if (playingVideo === videoId) {
      videoRefs.current.get(videoId)?.pause();
      setPlayingVideo(null);
    }
  }, [playingVideo]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
    if (playingVideo) {
      const v = videoRefs.current.get(playingVideo);
      if (v) v.muted = !muted;
    }
  }, [playingVideo, muted]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const videoId = entry.target.getAttribute('data-video-id');
        if (!videoId) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.8) playVideo(videoId);
        else if (playingVideo === videoId) pauseVideo(videoId);
      });
    }, { threshold: [0, 0.8, 1], rootMargin: '0px 0px -10% 0px' });
    return () => observerRef.current?.disconnect();
  }, [playVideo, pauseVideo, playingVideo]);

  const registerVideo = useCallback((id: string, el: HTMLVideoElement) => {
    videoRefs.current.set(id, el);
    observerRef.current?.observe(el);
  }, []);
  const unregisterVideo = useCallback((id: string) => {
    const v = videoRefs.current.get(id);
    if (v) observerRef.current?.unobserve(v);
    videoRefs.current.delete(id);
  }, []);

  return { playingVideo, muted, playVideo, pauseVideo, toggleMute, registerVideo, unregisterVideo };
};

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.current.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: 'audio/wav' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p >= 10 ? (stopRecording(), 10) : p + 1), 1000);
    } catch { throw new Error('Microfone inacessível'); }
  };
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };
  const resetRecording = () => { setAudioBlob(null); setRecordingTime(0); };
  useEffect(() => { return () => clearInterval(timerRef.current); }, []);
  return { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording };
};

/* ---------- COMPONENT PRINCIPAL ---------- */
export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /* States */
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [postType, setPostType] = useState<'standard' | 'photo_audio'>('standard');

  const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const { playingVideo, muted, playVideo, pauseVideo, toggleMute, registerVideo, unregisterVideo } = useVideoAutoPlayer();

  const [aiEditing, setAiEditing] = useState<{open: boolean; imageIndex: number; selectedStyle: string | null; loading: boolean}>({
    open: false, imageIndex: -1, selectedStyle: null, loading: false
  });

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);

  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);
  const [voteUsersDialog, setVoteUsersDialog] = useState<{open: boolean; postId: string | null; voteType: "heart" | "bomb" | null}>({ open: false, postId: null, voteType: null });

  // Estados para o carrossel Flash
  const [currentFlashIndex, setCurrentFlashIndex] = useState(0);

  /* Data */
  useEffect(() => {
    if (!user) return;
    supabase.from("last_viewed").upsert({ user_id: user.id, section: "feed", viewed_at: new Date().toISOString() }, { onConflict: "user_id,section" }).then(() => queryClient.invalidateQueries({ queryKey: ["unread-feed", user.id] }));
  }, [user, queryClient]);

  const { data: posts, refetch } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select(`*, profiles:user_id (id, username, avatar_url, full_name), likes (id, user_id), comments (id), post_votes (id, user_id, vote_type)`).eq("is_community_approved", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data as PostRow[];
    },
    enabled: !!user,
  });

  const { data: voteUsers } = useQuery({
    queryKey: ["vote-users", voteUsersDialog.postId, voteUsersDialog.voteType],
    queryFn: async () => {
      if (!voteUsersDialog.postId) return [];
      const { data } = await supabase.from("post_votes").select(`vote_type, profiles:user_id (id, username, avatar_url)`).eq("post_id", voteUsersDialog.postId).eq("vote_type", voteUsersDialog.voteType);
      return data?.map(v => ({ id: v.profiles.id, username: v.profiles.username, avatar_url: v.profiles.avatar_url, vote_type: v.vote_type })) as VoteUser[];
    },
    enabled: !!voteUsersDialog.postId,
  });

  useEffect(() => {
    const ch = supabase.channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_votes" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  useEffect(() => {
    const f = async () => { try { await supabase.functions.invoke("process-votes"); } catch {} };
    const i = setInterval(f, 60000); f(); return () => clearInterval(i);
  }, []);

  /* Handlers */
  const onFilesPicked = async (files?: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setProcessing(true);
    const accepted: File[] = [];
    for (const f of list) {
      try {
        if (f.type.startsWith("image/")) accepted.push(await compressImage(f, 1440, 0.8));
        else if (f.type.startsWith("video/")) {
          const dur = await getMediaDurationSafe(f).catch(() => 0);
          if (dur <= 15.3) accepted.push(f); else toast({ variant: "destructive", title: "Vídeo longo (Max 15s)" });
        } else if (f.type.startsWith("audio/")) {
          const dur = await getMediaDurationSafe(f).catch(() => 0);
          if (dur <= 10) accepted.push(f); else toast({ variant: "destructive", title: "Áudio longo (Max 10s)" });
        }
      } catch {}
    }
    setProcessing(false);
    if (accepted.length) setMediaFiles(prev => [...prev, ...accepted]);
  };
  const removeFile = (idx: number) => setMediaFiles(prev => prev.filter((_, i) => i !== idx));

  /* IA Logic (Com Rejuvenescer Avançado) */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
  };
  const createFileFromBase64 = async (base64: string, filename: string): Promise<File> => {
    const res = await fetch(base64); const blob = await res.blob(); return new File([blob], filename, { type: "image/jpeg", lastModified: Date.now() });
  };

  const processImageLocally = async (base64Image: string, filterType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width; canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        if (filterType === 'rejuvenate') {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.filter = 'blur(12px)'; 
          tempCtx.drawImage(img, 0, 0);

          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.6;
          ctx.drawImage(tempCanvas, 0, 0);

          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = 0.4;
          ctx.filter = 'contrast(1.2)';
          ctx.drawImage(img, 0, 0);

          ctx.globalCompositeOperation = 'soft-light';
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#ffb7a5';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
          ctx.filter = 'saturate(1.1)';
          ctx.drawImage(canvas, 0, 0);
        }
        else if (filterType === 'oil') { ctx.filter = 'saturate(1.8) contrast(1.2) brightness(1.1)'; ctx.drawImage(canvas, 0, 0); }
        else if (filterType === 'cartoon') { ctx.filter = 'saturate(2.0) contrast(1.3)'; ctx.drawImage(canvas, 0, 0); }
        else if (filterType === 'sketch') { ctx.filter = 'grayscale(1) contrast(2.0) brightness(1.3)'; ctx.drawImage(canvas, 0, 0); }
        else if (filterType === 'fantasy') {
          ctx.filter = 'contrast(1.2) saturate(1.3)'; ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'screen';
          const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); g.addColorStop(0, 'rgba(100,0,255,0.2)'); g.addColorStop(1, 'rgba(255,0,100,0.2)'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'beauty') { ctx.filter = 'brightness(1.05) saturate(1.2) contrast(1.05)'; ctx.drawImage(canvas, 0, 0); }
        else if (filterType === 'hdr') { ctx.filter = 'contrast(1.3) saturate(1.3) brightness(1.1)'; ctx.drawImage(canvas, 0, 0); }
        else if (filterType === 'bw') { ctx.filter = 'grayscale(1.0) contrast(1.2)'; ctx.drawImage(canvas, 0, 0); }
        else if (filterType === 'vintage') { ctx.filter = 'sepia(0.8) brightness(0.9) contrast(1.2)'; ctx.drawImage(canvas, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(255,200,100,0.15)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        else if (filterType === 'cyberpunk') {
          ctx.filter = 'contrast(1.4) saturate(1.5)'; ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'color-dodge'; const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); g.addColorStop(0, 'rgba(255,0,255,0.3)'); g.addColorStop(1, 'rgba(0,255,255,0.3)'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'matrix') { ctx.filter = 'grayscale(1) contrast(1.5)'; ctx.drawImage(canvas, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(0,255,0,0.4)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        else if (filterType === 'anime') { ctx.filter = 'saturate(2.5) contrast(1.2)'; ctx.drawImage(canvas, 0, 0); }
        else if (filterType === 'terror') { ctx.filter = 'grayscale(0.8) contrast(1.8)'; ctx.drawImage(canvas, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(100,0,0,0.4)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        else if (filterType === 'cold') { ctx.filter = 'saturate(0.8) brightness(1.1)'; ctx.drawImage(canvas, 0, 0); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(0,200,255,0.3)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

        ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
        ctx.font = '16px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('✨ AI Filter', 10, canvas.height - 10);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = (e) => reject(e); img.src = base64Image;
    });
  };

  const handleApplyStyle = async (styleId: string) => {
    const selectedStyle = AI_STYLES.find(s => s.id === styleId);
    if (!selectedStyle || aiEditing.imageIndex === -1) return;
    setAiEditing(prev => ({...prev, loading: true, selectedStyle: styleId}));
    try {
      const base64Image = await fileToBase64(mediaFiles[aiEditing.imageIndex]);
      let processed: string;
      try {
        const res = await fetch('/.netlify/functions/huggingface-proxy', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: selectedStyle.prompt, image: base64Image }) });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error("Fallback");
        processed = json.image;
        toast({ title: "✨ Sucesso Nuvem", description: selectedStyle.label });
      } catch {
        processed = await processImageLocally(base64Image, selectedStyle.filter);
        toast({ title: "⚡ Sucesso Local", description: selectedStyle.label });
      }
      const newFile = await createFileFromBase64(processed, `ai-${styleId}-${Date.now()}.jpg`);
      setMediaFiles(p => { const n = [...p]; n[aiEditing.imageIndex] = newFile; return n; });
      setAiEditing({open: false, imageIndex: -1, selectedStyle: null, loading: false});
    } catch { toast({ variant: "destructive", title: "Erro" }); setAiEditing(p=>({...p, loading: false})); }
  };

  /* Post Creation */
  const handleCreatePost = async () => {
    if (postType === 'photo_audio' && (!audioBlob || mediaFiles.length === 0)) { 
      toast({ variant: "destructive", title: "Foto + Áudio obrigatórios" }); 
      return; 
    }
    if (postType === 'standard' && !newPost.trim() && mediaFiles.length === 0) { 
      toast({ variant: "destructive", title: "Conteúdo vazio" }); 
      return; 
    }
    
    setUploading(true);
    try {
      const mediaUrls: string[] = [];
      let audioUrl: string | null = null;
      
      // Upload de mídias
      for (const file of mediaFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user?.id}/${Date.now()}-${Math.random()}.${ext}`;
        await supabase.storage.from("media").upload(path, file);
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        mediaUrls.push((file.type.startsWith("video/") ? MEDIA_PREFIX.video : MEDIA_PREFIX.image) + data.publicUrl);
      }
      
      // Upload de áudio se existir
      if (audioBlob) {
        const path = `${user?.id}/${Date.now()}-audio.wav`;
        await supabase.storage.from("media").upload(path, audioBlob);
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        audioUrl = MEDIA_PREFIX.audio + data.publicUrl;
      }
      
      // Define 60 minutos para votação
      const ends = new Date(); 
      ends.setMinutes(ends.getMinutes() + 60);

      const content = postType === 'photo_audio' ? '' : newPost;
      const { data: post, error } = await supabase.from("posts").insert({ 
        user_id: user?.id, 
        content, 
        media_urls: mediaUrls.length ? mediaUrls : null, 
        audio_url: audioUrl, 
        post_type: postType, 
        voting_ends_at: ends.toISOString(), 
        voting_period_active: true 
      }).select().single();
      
      if (error) throw error;
      
      // Salva menções se houver conteúdo
      if (content) { 
        const { saveMentions } = await import("@/utils/mentionsHelper"); 
        await saveMentions(post.id, "post", content, user!.id); 
      }
      
      // Mostra notificação e redireciona para Arena
      toast({ 
        title: "Post publicado! 🎉", 
        description: "Seu post foi enviado para a Arena. Boa sorte na votação!" 
      });
      
      // Limpa o formulário
      setNewPost(""); 
      setMediaFiles([]); 
      resetRecording();
      refetch();
      
      // Redireciona para a tela de Arena após 2 segundos
      setTimeout(() => {
        navigate("/arena");
      }, 2000);
      
    } catch (e:any) { 
      toast({ variant: "destructive", title: "Erro ao publicar", description: e.message }); 
    } finally { 
      setUploading(false); 
    }
  };

  /* Helpers de Ação */
  const handleLike = async (postId: string) => {
      try {
        const has = posts?.find(p => p.id === postId)?.likes?.find((l:any) => l.user_id === user?.id);
        if (has) await supabase.from("likes").delete().match({ id: has.id });
        else await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
        refetch();
      } catch {}
  };

  const handleVote = async (postId: string, type: "heart" | "bomb") => {
    try {
      const has = posts?.find(p => p.id === postId)?.post_votes?.find((v:any) => v.user_id === user?.id);
      if (has?.vote_type === type) await supabase.from("post_votes").delete().match({ post_id: postId, user_id: user?.id });
      else if (has) await supabase.from("post_votes").update({ vote_type: type }).match({ post_id: postId, user_id: user?.id });
      else await supabase.from("post_votes").insert({ post_id: postId, user_id: user?.id, vote_type: type });
      refetch();
    } catch {}
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("posts").delete().eq("id", id); },
    onSuccess: () => { toast({ title: "Excluído" }); refetch(); }
  });
  const addComment = useMutation({
    mutationFn: async () => { if (openingCommentsFor && newCommentText.trim()) await supabase.from("comments").insert({ post_id: openingCommentsFor.id, user_id: user!.id, content: newCommentText.trim() }); },
    onSuccess: () => { setNewCommentText(""); queryClient.invalidateQueries({ queryKey: ["post-comments"] }); refetch(); }
  });

  const flashPosts = posts?.filter(x => x.post_type === 'photo_audio') || [];

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id], enabled: !!openingCommentsFor,
    queryFn: async () => (await supabase.from("comments").select(`*, author:profiles!comments_user_id_fkey(username, avatar_url)`).eq("post_id", openingCommentsFor!.id).order("created_at")).data
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        <div className="flex justify-center"><img src="https://sistemaapp.netlify.app/assets/logo-wTbWaudN.png" alt="Logo" className="w-32 h-32 object-contain"/></div>

        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex gap-2 mb-4 justify-center">
              <Button variant={postType==='standard'?"default":"outline"} onClick={()=>setPostType('standard')} className="rounded-full px-6">Feed</Button>
              <Button variant={postType==='photo_audio'?"default":"outline"} onClick={()=>setPostType('photo_audio')} className="rounded-full px-6">Flash</Button>
            </div>

            <div className="flex gap-3">
              <Avatar><AvatarImage src={user?.user_metadata?.avatar_url}/><AvatarFallback>{user?.email?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1 space-y-3">
                {postType === 'standard' && <MentionTextarea value={newPost} onChange={(e)=>setNewPost(e.target.value)} placeholder="No que está pensando? @menção #tag" className="bg-muted/30 border-0 min-h-[100px] rounded-xl"/>}
                {postType === 'photo_audio' && (
                  <div className="text-center p-4 border border-dashed rounded-xl bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">1. Tire uma foto &nbsp; 2. Grave um áudio (10s)</p>
                    {!audioBlob ? <Button variant={isRecording?"destructive":"secondary"} onClick={isRecording?stopRecording:startRecording} className="w-full">{isRecording?`Parar (${10-recordingTime}s)`:<><Mic className="mr-2 h-4 w-4"/> Gravar Áudio</>}</Button> : <div className="flex items-center justify-center gap-2 text-green-600"><Volume2 className="h-4 w-4"/> Gravado! <Button variant="ghost" size="sm" onClick={resetRecording} className="text-destructive h-6 w-6 p-0"><X className="h-4 w-4"/></Button></div>}
                  </div>
                )}

                {/* Multi-Media Preview Carousel */}
                {mediaFiles.length > 0 && (
                  <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <div className="flex w-max space-x-2 p-2">
                      {mediaFiles.map((file, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group shrink-0">
                          {file.type.startsWith("image/") ? <img src={URL.createObjectURL(file)} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-black flex items-center justify-center"><Video className="text-white"/></div>}
                          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={()=>removeFile(i)}><X className="h-3 w-3"/></Button>
                          {file.type.startsWith("image/") && <Button size="icon" className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-purple-600 hover:bg-purple-700" onClick={()=>setAiEditing({open: true, imageIndex: i, selectedStyle: null, loading: false})}><Wand2 className="h-3 w-3"/></Button>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <input ref={galleryInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e=>onFilesPicked(e.target.files)}/>
                    <input ref={cameraPhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>onFilesPicked(e.target.files)}/>
                    <input ref={cameraVideoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={e=>onFilesPicked(e.target.files)}/>
                    <Button variant="ghost" size="icon" onClick={()=>galleryInputRef.current?.click()}><Images className="h-5 w-5 text-muted-foreground"/></Button>
                    <Button variant="ghost" size="icon" onClick={()=>cameraPhotoInputRef.current?.click()}><Camera className="h-5 w-5 text-muted-foreground"/></Button>
                    {/* Botão IA dedicado (Abre Galeria) */}
                    <Button variant="ghost" size="icon" onClick={()=>galleryInputRef.current?.click()} className="text-purple-600 bg-purple-50 hover:bg-purple-100"><Sparkles className="h-5 w-5"/></Button>
                    {postType==='standard'&&<Button variant="ghost" size="icon" onClick={()=>cameraVideoInputRef.current?.click()}><Video className="h-5 w-5 text-muted-foreground"/></Button>}
                  </div>
                  <Button onClick={handleCreatePost} disabled={uploading} className="rounded-full px-6 font-bold bg-gradient-to-r from-primary to-purple-600">
                    {uploading?"Publicando...":"Publicar na Arena"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carrossel Flash */}
        {flashPosts.length > 0 && (
          <FlashCarousel
            posts={flashPosts}
            currentIndex={currentFlashIndex}
            setCurrentIndex={setCurrentFlashIndex}
            user={user}
            handleLike={handleLike}
            handleVote={handleVote}
          />
        )}

        {posts?.map((post) => {
          if (post.post_type === 'photo_audio') return null;
          
          const isVoting = post.voting_period_active;
          const heartCount = post.post_votes?.filter((v:any) => v.vote_type === 'heart').length || 0;
          const bombCount = post.post_votes?.filter((v:any) => v.vote_type === 'bomb').length || 0;
          const totalVotes = heartCount + bombCount;
          const approvalRate = totalVotes > 0 ? (heartCount / totalVotes) * 100 : 50;

          return (
            <Card key={post.id} className={cn("border-0 shadow-md overflow-hidden transition-all", isVoting ? "ring-2 ring-orange-400/50" : "hover:shadow-lg")}>
              <CardContent className="p-0">
                {/* Cabeçalho do Post */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarImage src={post.profiles?.avatar_url}/><AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback></Avatar>
                    <div>
                      <UserLink userId={post.user_id} username={post.profiles?.username||""} className="font-bold text-sm hover:underline">{post.profiles?.username}</UserLink>
                      <div className="flex items-center gap-2">
                         <p className="text-xs text-muted-foreground">{fmtDateTime(post.created_at)}</p>
                         {/* Indicador de Status */}
                         {isVoting ? <Badge variant="secondary" className="text-[10px] h-4 bg-orange-100 text-orange-700 hover:bg-orange-100">Em Votação</Badge> : <Badge variant="outline" className="text-[10px] h-4 border-green-200 text-green-700">Aprovado</Badge>}
                      </div>
                    </div>
                  </div>
                  {post.user_id === user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingPost(post); setEditContent(post.content||""); }}><Pencil className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(post.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4"/> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                {post.content && <div className="px-4 pb-3 text-sm"><MentionText text={post.content}/></div>}
                
                {post.media_urls?.length > 0 && (
                  <div className={cn("grid gap-0.5", post.media_urls.length===1 ? "grid-cols-1" : "grid-cols-2")}>
                    {post.media_urls.map((u:string, i:number) => {
                      const url = stripPrefix(u);
                      if (isVideoUrl(u)) {
                        const vidId = `${post.id}-${i}`;
                        return (
                          <div key={i} className="relative bg-black aspect-square">
                            <video ref={el=>{if(el)registerVideo(vidId, el); else unregisterVideo(vidId);}} data-video-id={vidId} src={url} className="w-full h-full object-cover" loop muted={muted} playsInline preload="metadata" onClick={()=>playingVideo===vidId?pauseVideo(vidId):playVideo(vidId)}/>
                            <Button variant="ghost" size="icon" className="absolute bottom-2 left-2 text-white bg-black/50 rounded-full h-8 w-8" onClick={(e)=>{e.stopPropagation(); toggleMute();}}>{muted?<VolumeX className="h-4 w-4"/>:<Volume2 className="h-4 w-4"/>}</Button>
                          </div>
                        );
                      }
                      return <ProgressiveImage key={i} src={url} alt="Post" className="aspect-square cursor-pointer" onClick={()=>{setViewerUrl(url); setViewerOpen(true);}}/>;
                    })}
                  </div>
                )}

                {/* ÁREA DE AÇÃO - LÓGICA CONDICIONAL */}
                {isVoting ? (
                  <div className="bg-orange-50/50 p-4 border-t border-orange-100">
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">Votação da Comunidade</span>
                       <VotingCountdown endsAt={post.voting_ends_at} onExpire={() => refetch()} />
                     </div>
                     
                     {/* Barra de Progresso da Votação */}
                     <div className="flex items-center gap-2 mb-3">
                        <Bomb className="h-4 w-4 text-red-500" />
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                           <div style={{ width: `${approvalRate}%` }} className="h-full bg-green-500 transition-all duration-500" />
                           <div style={{ width: `${100 - approvalRate}%` }} className="h-full bg-red-500 transition-all duration-500" />
                        </div>
                        <Heart className="h-4 w-4 text-green-500 fill-green-500" />
                     </div>

                     <div className="flex gap-2">
                        <Button className={cn("flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700", post.post_votes?.find((v:any) => v.user_id === user?.id && v.vote_type === 'bomb') && "bg-red-100 ring-1 ring-red-400")} onClick={()=>handleVote(post.id, "bomb")}>
                          <Bomb className="mr-2 h-4 w-4"/> Rejeitar ({bombCount})
                        </Button>
                        <Button className={cn("flex-1 bg-white border border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700", post.post_votes?.find((v:any) => v.user_id === user?.id && v.vote_type === 'heart') && "bg-green-100 ring-1 ring-green-400")} onClick={()=>handleVote(post.id, "heart")}>
                          <Heart className="mr-2 h-4 w-4 fill-current"/> Aprovar ({heartCount})
                        </Button>
                     </div>
                  </div>
                ) : (
                  // MODO FEED NORMAL (APÓS APROVAÇÃO)
                  <div className="p-3 flex items-center gap-2 border-t">
                    <Button variant="ghost" size="sm" onClick={()=>handleLike(post.id)} className={cn("rounded-full transition-colors", post.likes?.some((l:any)=>l.user_id===user?.id) && "text-red-500 bg-red-50")}>
                      <Heart className={cn("h-5 w-5 mr-1", post.likes?.some((l:any)=>l.user_id===user?.id)&&"fill-current")}/> 
                      {post.likes?.length||0}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={()=>setOpeningCommentsFor(post)} className="rounded-full">
                      <MessageCircle className="h-5 w-5 mr-1"/> 
                      {post.comments?.length||0}
                    </Button>
                    <div className="ml-auto">
                      <Button variant="ghost" size="icon" className="rounded-full"><Bookmark className="h-5 w-5"/></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialogs */}
      <Dialog open={aiEditing.open} onOpenChange={o => setAiEditing(p => ({...p, open: o}))}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-purple-600"/> Estúdio Mágico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {mediaFiles[aiEditing.imageIndex] && (
              <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={URL.createObjectURL(mediaFiles[aiEditing.imageIndex])} className="w-full h-full object-contain"/>
                {aiEditing.loading && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm"><Sparkles className="h-10 w-10 animate-spin text-purple-400 mb-2"/><span className="font-bold">Aplicando mágica...</span></div>}
              </div>
            )}
            <ScrollArea className="h-48"><div className="grid grid-cols-2 gap-2 pr-4">{AI_STYLES.map(s => { const I = s.icon; return (
              <button key={s.id} disabled={aiEditing.loading} onClick={() => handleApplyStyle(s.id)} className={cn("flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-accent", aiEditing.loading && "opacity-50")}>
                <div className={cn("p-2 rounded-lg", s.color)}><I className="h-5 w-5"/></div><span className="text-sm font-medium">{s.label}</span>
              </button>
            )})}</div></ScrollArea>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setAiEditing(p => ({...p, open: false}))}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openingCommentsFor} onOpenChange={o => !o && setOpeningCommentsFor(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>Comentários</DialogTitle></DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            {loadingComments ? <p className="text-center py-4 text-muted-foreground">Carregando...</p> : comments?.map((c:any) => (
              <div key={c.id} className="flex gap-3 mb-4"><Avatar className="h-8 w-8"><AvatarImage src={c.author?.avatar_url}/><AvatarFallback>{c.author?.username?.[0]}</AvatarFallback></Avatar><div><span className="font-bold text-sm mr-2">{c.author?.username}</span><span className="text-sm">{c.content}</span></div></div>
            ))}
          </ScrollArea>
          <div className="flex gap-2 mt-2"><Input value={newCommentText} onChange={e => setNewCommentText(e.target.value)} placeholder="Comente..." className="rounded-full"/><Button size="icon" className="rounded-full" onClick={()=>addComment.mutate()}><Send className="h-4 w-4"/></Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-0"><div className="relative h-[80vh] flex items-center justify-center"><img src={viewerUrl||""} className="max-h-full max-w-full object-contain"/><Button variant="secondary" size="icon" className="absolute top-4 right-4 rounded-full" onClick={()=>setViewerOpen(false)}><Minimize2 className="h-4 w-4"/></Button></div></DialogContent>
      </Dialog>
    </div>
  );
}