import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, Bomb, X, Pencil, Trash2,
  Camera, Video, Minimize2, Images, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Sparkles, Wand2,
  Clock, Loader2, Flame, TrendingUp, Users, Zap, Globe, Zap as FlashIcon,
  RefreshCw, RotateCw, Volume1
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

/* ---------- COMPONENTE: Imagem Progressiva ---------- */
const ProgressiveImage = ({ src, alt, className, onClick }: { src: string, alt: string, className?: string, onClick?: () => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const isValidSrc = src && (src.startsWith('http') || src.startsWith('blob') || src.startsWith('data') || src.includes('supabase'));
  
  if (!isValidSrc || hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/30 rounded-lg", className)}>
        <div className="text-center p-4">
          <Images className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Mídia não disponível</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("relative overflow-hidden bg-muted/30 rounded-lg", className)} onClick={onClick}>
      <img 
        src={src} 
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full object-cover filter blur-xl scale-110 transition-opacity duration-700",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        aria-hidden="true"
        onError={() => setHasError(true)}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          "relative w-full h-full object-cover transition-all duration-700 rounded-lg",
          isLoaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-sm scale-105"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

/* ---------- COMPONENTE: VideoPlayer com Controles Aprimorados ---------- */
interface VideoPlayerProps {
  src: string;
  className?: string;
  videoId: string;
  playingVideo: string | null;
  muted: boolean;
  registerVideo: (id: string, el: HTMLVideoElement) => void;
  unregisterVideo: (id: string) => void;
  playVideo: (id: string) => void;
  pauseVideo: (id: string) => void;
  toggleMute: () => void;
}

const VideoPlayer = ({ 
  src, 
  className, 
  videoId, 
  playingVideo, 
  muted, 
  registerVideo, 
  unregisterVideo,
  playVideo,
  pauseVideo,
  toggleMute
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const isPlaying = playingVideo === videoId;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      registerVideo(videoId, videoRef.current);
    }
    return () => {
      unregisterVideo(videoId);
    };
  }, [videoId, registerVideo, unregisterVideo]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.loop = isLooping;
    }
  }, [muted, isLooping]);

  const handleVideoClick = () => {
    setShowControls(true);
    if (isPlaying) {
      pauseVideo(videoId);
    } else {
      playVideo(videoId);
    }
    setTimeout(() => setShowControls(false), 3000);
  };

  const toggleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLooping(!isLooping);
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (!isPlaying) {
        playVideo(videoId);
      }
    }
  };

  // Pausar vídeo quando o usuário rolar para fora da visualização
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && isPlaying) {
            pauseVideo(videoId);
          }
        });
      },
      { threshold: 0.1 } // Pausa quando menos de 10% do vídeo está visível
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [isPlaying, videoId, pauseVideo]);

  if (hasError || !src) {
    return (
      <div className={cn("flex items-center justify-center bg-black rounded-lg", className)}>
        <div className="text-center p-4">
          <Video className="h-8 w-8 text-white/50 mx-auto" />
          <p className="text-xs text-white/70 mt-2">Vídeo não disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative group rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        data-video-id={videoId}
        src={src}
        className={cn("w-full h-full object-cover cursor-pointer rounded-lg", className)}
        onClick={handleVideoClick}
        muted={muted}
        playsInline
        preload="metadata"
        loop={isLooping}
        onError={() => setHasError(true)}
      />
      
      {/* Overlay de controles */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 transition-opacity duration-300",
        showControls || !isPlaying ? "opacity-100" : "opacity-0"
      )}>
        {/* Botão de play/pause central */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30"
              onClick={handleVideoClick}
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        )}
        
        {/* Controles inferiores */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              {/* Botão de reiniciar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={handleRestart}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            {isPlaying && (
              <div className="bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Pause className="h-3 w-3" /> Reproduzindo
              </div>
            )}
          </div>
        </div>
        
        {/* Indicador de loop */}
        {isLooping && (
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <RotateCw className="h-3 w-3" /> Repetir
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- COMPONENTE: Timer de Votação ---------- */
const VotingCountdown = ({ endsAt, onExpire }: { endsAt: string; onExpire?: () => void }) => {
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

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  if (isExpired) return (
    <Badge variant="destructive" className="text-xs">
      <Clock className="h-3 w-3 mr-1" />
      Encerrado
    </Badge>
  );

  return (
    <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
      <Clock className="h-3 w-3 mr-1" />
      <span>{timeLeft}</span>
    </Badge>
  );
};

/* ---------- COMPONENTE: Player de Áudio com Controle de Scroll ---------- */
interface AudioPlayerProps {
  src: string;
  isPlaying: boolean;
  onPlayPause: (audioUrl: string) => void;
  audioUrl: string;
}

const AudioPlayer = ({ src, isPlaying, onPlayPause, audioUrl }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pausar áudio quando o usuário rolar para fora da visualização
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPlaying) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && isPlaying) {
            onPlayPause(audioUrl); // Pausa o áudio
          }
        });
      },
      { threshold: 0.1 } // Pausa quando menos de 10% do container está visível
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [isPlaying, audioUrl, onPlayPause]);

  const handlePlayPause = () => {
    onPlayPause(audioUrl);
  };

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="icon"
        onClick={handlePlayPause}
        className={cn(
          "rounded-full transition-all",
          isPlaying ? "bg-primary text-primary-foreground scale-110" : "bg-muted"
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>
      <span className="text-xs text-muted-foreground">
        {isPlaying ? "Tocando..." : "Clique para ouvir"}
      </span>
    </div>
  );
};

/* ---------- Helpers ---------- */
const stripPrefix = (u: any): string => {
  if (!u || typeof u !== 'string') return '';
  return u.replace(/^(image::|video::|audio::)/, "");
};

const isVideoUrl = (u: any): boolean => {
  if (!u || typeof u !== 'string') return false;
  
  const cleanUrl = stripPrefix(u);
  const videoExtensions = /\.(mp4|webm|ogg|mov|m4v|avi|mkv|flv|wmv)$/i;
  return u.startsWith('video::') || videoExtensions.test(cleanUrl);
};

const isAudioUrl = (u: any): boolean => {
  if (!u || typeof u !== 'string') return false;
  const cleanUrl = stripPrefix(u);
  const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
  return u.startsWith('audio::') || audioExtensions.test(cleanUrl);
};

const fmtDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } catch {
    return "Data inválida";
  }
};

/* ---------- Hook para Controle de Vídeo com Scroll ---------- */
const useVideoAutoPlayer = () => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const playVideo = useCallback(async (videoId: string) => {
    const video = videoRefs.current.get(videoId);
    if (video && playingVideo !== videoId) {
      try {
        // Pausar vídeo atual se houver
        if (playingVideo) {
          const currentVideo = videoRefs.current.get(playingVideo);
          if (currentVideo) {
            currentVideo.pause();
          }
        }
        
        setPlayingVideo(videoId);
        video.muted = muted;
        await video.play();
      } catch (e) {
        console.error("Erro ao reproduzir vídeo:", e);
      }
    }
  }, [playingVideo, muted]);

  const pauseVideo = useCallback((videoId: string) => {
    if (playingVideo === videoId) {
      const video = videoRefs.current.get(videoId);
      if (video) {
        video.pause();
        setPlayingVideo(null);
      }
    }
  }, [playingVideo]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
    if (playingVideo) {
      const v = videoRefs.current.get(playingVideo);
      if (v) v.muted = !muted;
    }
  }, [playingVideo, muted]);

  // Configurar Intersection Observer para pausar vídeos quando saírem da tela
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const videoId = entry.target.getAttribute('data-video-id');
        if (!videoId) return;
        
        if (entry.isIntersecting) {
          // Vídeo está visível, mas não reproduz automaticamente
          // Aguardar clique do usuário
        } else if (playingVideo === videoId) {
          // Vídeo está reproduzindo e saiu da tela, pausar
          pauseVideo(videoId);
        }
      });
    }, { 
      threshold: 0.1, // Quando 10% do vídeo está visível
      rootMargin: '0px'
    });
    
    return () => observerRef.current?.disconnect();
  }, [pauseVideo, playingVideo]);

  const registerVideo = useCallback((id: string, el: HTMLVideoElement) => {
    videoRefs.current.set(id, el);
    observerRef.current?.observe(el);
  }, []);
  
  const unregisterVideo = useCallback((id: string) => {
    const v = videoRefs.current.get(id);
    if (v) observerRef.current?.unobserve(v);
    videoRefs.current.delete(id);
  }, []);

  return { 
    playingVideo, 
    muted, 
    playVideo, 
    pauseVideo, 
    toggleMute,
    registerVideo, 
    unregisterVideo 
  };
};

/* ---------- COMPONENT PRINCIPAL ---------- */
export default function Arena() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* States */
  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { 
    playingVideo, 
    muted, 
    playVideo, 
    pauseVideo, 
    toggleMute,
    registerVideo, 
    unregisterVideo 
  } = useVideoAutoPlayer();

  /* Data */
  useEffect(() => {
    if (!user) return;
    supabase.from("last_viewed").upsert({ 
      user_id: user.id, 
      section: "arena", 
      viewed_at: new Date().toISOString() 
    }, { 
      onConflict: "user_id,section" 
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["unread-arena", user.id] });
    });
  }, [user, queryClient]);

  const { data: posts, refetch } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            profiles:user_id (id, username, avatar_url, full_name),
            likes (id, user_id),
            comments (id),
            post_votes (id, user_id, vote_type)
          `)
          .eq("is_community_approved", false)
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error("Erro ao buscar posts:", error);
          throw error;
        }
        
        const processedData = (data || []).map(post => {
          let mediaUrls = [];
          
          if (post.media_urls && Array.isArray(post.media_urls)) {
            mediaUrls = post.media_urls
              .filter((url: any) => url && typeof url === 'string')
              .map((url: string) => url.trim())
              .filter((url: string) => url.length > 0);
          }
          
          return {
            ...post,
            media_urls: mediaUrls
          };
        });
        
        return processedData as PostRow[];
      } catch (error) {
        console.error("Erro na query de posts:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  useEffect(() => {
    const channel = supabase.channel("arena-realtime")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "posts" }, 
        () => {
          refetch();
        }
      )
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "post_votes" }, 
        () => refetch()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  useEffect(() => {
    const f = async () => { 
      try { 
        await supabase.functions.invoke("process-votes"); 
      } catch (e) {
        console.error("Erro ao processar votos:", e);
      }
    };
    const i = setInterval(f, 60000); 
    f(); 
    return () => clearInterval(i);
  }, []);

  /* Handlers */
  const handleLike = async (postId: string) => {
      try {
        const post = posts?.find(p => p.id === postId);
        if (!post) return;
        
        const hasLiked = post.likes?.some((l:any) => l.user_id === user?.id);
        
        if (hasLiked) {
          const likeToRemove = post.likes.find((l:any) => l.user_id === user?.id);
          if (likeToRemove) {
            await supabase.from("likes").delete().eq("id", likeToRemove.id);
          }
        } else {
          await supabase.from("likes").insert({ 
            post_id: postId, 
            user_id: user?.id 
          });
        }
        
        refetch();
      } catch (error) {
        console.error("Erro ao curtir:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível curtir o post"
        });
      }
  };

  const handleVote = async (postId: string, type: "heart" | "bomb") => {
    try {
      const has = posts?.find(p => p.id === postId)?.post_votes?.find((v:any) => v.user_id === user?.id);
      if (has?.vote_type === type) {
        await supabase.from("post_votes").delete().match({ post_id: postId, user_id: user?.id });
      } else if (has) {
        await supabase.from("post_votes").update({ vote_type: type }).match({ post_id: postId, user_id: user?.id });
      } else {
        await supabase.from("post_votes").insert({ post_id: postId, user_id: user?.id, vote_type: type });
      }
      refetch();
    } catch (error) {
      console.error("Erro ao votar:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar seu voto"
      });
    }
  };

  // Função para tocar/pausar áudio com controle de scroll
  const handleAudioPlayPause = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      // Pausar áudio atual
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudio(null);
        audioRef.current = null;
      }
    } else {
      // Parar qualquer áudio atual
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const cleanUrl = stripPrefix(audioUrl);
      const audio = new Audio(cleanUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setPlayingAudio(null);
        audioRef.current = null;
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível reproduzir o áudio"
        });
      };
      
      audio.play().catch(error => {
        console.error("Erro ao reproduzir áudio:", error);
        setPlayingAudio(null);
        audioRef.current = null;
      });
      
      setPlayingAudio(audioUrl);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { 
      await supabase.from("posts").delete().eq("id", id); 
    },
    onSuccess: () => { 
      toast({ title: "Post excluído com sucesso" }); 
      refetch(); 
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message
      });
    }
  });
  
  const addComment = useMutation({
    mutationFn: async () => { 
      if (openingCommentsFor && newCommentText.trim()) {
        const { data: comment, error } = await supabase
          .from("comments")
          .insert({ 
            post_id: openingCommentsFor.id, 
            user_id: user!.id, 
            content: newCommentText.trim() 
          })
          .select()
          .single();
        
        if (error) throw error;

        try {
          const { saveMentions } = await import("@/utils/mentionsHelper");
          await saveMentions(comment.id, "comment", newCommentText.trim(), user!.id);
        } catch (mentionError) {
          console.warn("Erro ao salvar menções do comentário:", mentionError);
        }

        return comment;
      }
    },
    onSuccess: () => { 
      setNewCommentText(""); 
      queryClient.invalidateQueries({ queryKey: ["post-comments"] }); 
      refetch(); 
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao comentar",
        description: error.message
      });
    }
  });

  // Função para renderizar mídias de um post
  const renderMedia = (post: any) => {
    if (!post.media_urls || !Array.isArray(post.media_urls) || post.media_urls.length === 0) {
      return null;
    }
    
    // Filtrar apenas URLs válidas
    const validMediaUrls = post.media_urls
      .filter((url: string) => {
        if (!url || typeof url !== 'string') return false;
        const cleanUrl = stripPrefix(url);
        return cleanUrl && cleanUrl.length > 0;
      })
      .slice(0, 4); // Limitar a 4 mídias

    if (validMediaUrls.length === 0) return null;

    const isSingle = validMediaUrls.length === 1;

    return (
      <div className={cn(
        "grid gap-0.5 rounded-lg overflow-hidden mb-3",
        validMediaUrls.length === 1 && "grid-cols-1",
        validMediaUrls.length === 2 && "grid-cols-2",
        validMediaUrls.length >= 3 && "grid-cols-2"
      )}>
        {validMediaUrls.map((url: string, idx: number) => {
          const mediaUrl = stripPrefix(url);
          const isVideo = isVideoUrl(url);
          const videoId = `${post.id}-${idx}`;

          if (isVideo) {
            return (
              <div key={idx} className="relative">
                <VideoPlayer
                  src={mediaUrl}
                  className={cn(
                    isSingle ? "max-h-96" : "h-48",
                    "w-full rounded-lg"
                  )}
                  videoId={videoId}
                  playingVideo={playingVideo}
                  muted={muted}
                  registerVideo={registerVideo}
                  unregisterVideo={unregisterVideo}
                  playVideo={playVideo}
                  pauseVideo={pauseVideo}
                  toggleMute={toggleMute}
                />
              </div>
            );
          }

          // Renderizar imagem
          return (
            <ProgressiveImage
              key={idx}
              src={mediaUrl}
              alt={`Mídia ${idx + 1} de ${post.profiles?.username}`}
              className={cn(
                "w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-lg",
                isSingle ? "max-h-96" : "h-48"
              )}
              onClick={() => {
                setViewerUrl(mediaUrl);
                setViewerOpen(true);
              }}
            />
          );
        })}
      </div>
    );
  };

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id], 
    enabled: !!openingCommentsFor,
    queryFn: async () => {
      if (!openingCommentsFor) return [];
      
      const { data, error } = await supabase
        .from("comments")
        .select(`*, author:profiles!comments_user_id_fkey(username, avatar_url)`)
        .eq("post_id", openingCommentsFor.id)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Erro ao buscar comentários:", error);
        return [];
      }
      
      return data || [];
    }
  });

  // Agrupar posts por tipo para sidebar
  const flashPosts = posts?.filter(x => x.post_type === 'photo_audio') || [];
  const clipsPosts = posts?.filter(x => x.post_type === 'viral_clips') || [];
  const standardPosts = posts?.filter(x => x.post_type === 'standard') || [];

  // Pausar todos os vídeos e áudios quando o componente desmontar
  useEffect(() => {
    return () => {
      // Pausar todos os vídeos
      if (playingVideo) {
        pauseVideo(playingVideo);
      }
      
      // Pausar áudio
      if (playingAudio && audioRef.current) {
        audioRef.current.pause();
        setPlayingAudio(null);
        audioRef.current = null;
      }
    };
  }, [playingVideo, playingAudio, pauseVideo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
        {/* Cabeçalho com logo */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex justify-center">
            <img 
              src="https://sistemaapp.netlify.app/assets/logo-wTbWaudN.png" 
              alt="Logo" 
              className="w-44 h-40 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-center mt-4 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Arena de Votação
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            Vote nas postagens e decida o que será aprovado para o World Flow
          </p>
        </div>

        {/* Layout principal - 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna principal - 3/4 largura */}
          <div className="lg:col-span-3 space-y-6">
            {/* Exibir todos os posts em votação */}
            {posts?.map((post) => {
              const isVoting = post.voting_period_active;
              const heartCount = post.post_votes?.filter((v:any) => v.vote_type === 'heart').length || 0;
              const bombCount = post.post_votes?.filter((v:any) => v.vote_type === 'bomb').length || 0;
              const totalVotes = heartCount + bombCount;
              const approvalRate = totalVotes > 0 ? (heartCount / totalVotes) * 100 : 50;
              const isAudio = post.audio_url && isAudioUrl(post.audio_url);
              const userVote = post.post_votes?.find((v:any) => v.user_id === user?.id);

              return (
                <div key={post.id} className="mb-6">
                  <Card className="border shadow-md overflow-hidden transition-all hover:shadow-lg bg-gradient-to-br from-white to-orange-50/30">
                    <CardContent className="p-0">
                      {/* Cabeçalho do Post */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="ring-2 ring-orange-100">
                            <AvatarImage src={post.profiles?.avatar_url}/>
                            <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                              {post.profiles?.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <UserLink 
                              userId={post.user_id} 
                              username={post.profiles?.username||""} 
                              className="font-bold text-sm hover:underline"
                            >
                              {post.profiles?.username}
                            </UserLink>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {fmtDateTime(post.created_at)}
                              </p>
                              {post.post_type === 'viral_clips' && (
                                <Badge variant="outline" className="text-[10px] h-4 bg-purple-100 text-purple-700 border-purple-300">
                                  <Flame className="h-3 w-3 mr-1" />
                                  ViralClip
                                </Badge>
                              )}
                              {post.post_type === 'photo_audio' && (
                                <Badge variant="outline" className="text-[10px] h-4 bg-pink-100 text-pink-700 border-pink-300">
                                  <FlashIcon className="h-3 w-3 mr-1" />
                                  Flash
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <VotingCountdown 
                            endsAt={post.voting_ends_at} 
                            onExpire={refetch}
                          />
                          {post.user_id === user?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-orange-50">
                                  <MoreVertical className="h-4 w-4"/>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => deleteMutation.mutate(post.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4"/> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      
                      {post.content && (
                        <div className="px-4 pb-3 text-sm">
                          <MentionText text={post.content}/>
                        </div>
                      )}
                      
                      {/* Renderizar mídias */}
                      {renderMedia(post)}

                      {/* Renderizar áudio se existir */}
                      {isAudio && (
                        <div className="px-4 pb-3">
                          <AudioPlayer
                            src={post.audio_url}
                            isPlaying={playingAudio === post.audio_url}
                            onPlayPause={handleAudioPlayPause}
                            audioUrl={post.audio_url}
                          />
                        </div>
                      )}

                      {/* ÁREA DE VOTAÇÃO */}
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 border-t border-orange-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-orange-800">
                            Votação da Comunidade
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
                          </div>
                        </div>
                        
                        {/* Barra de Progresso da Votação */}
                        <div className="flex items-center gap-2 mb-3">
                          <Bomb className="h-4 w-4 text-red-500" />
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                            <div 
                              style={{ width: `${approvalRate}%` }} 
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" 
                            />
                            <div 
                              style={{ width: `${100 - approvalRate}%` }} 
                              className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500" 
                            />
                          </div>
                          <Heart className="h-4 w-4 text-green-500 fill-green-500" />
                        </div>

                        {/* Porcentagens */}
                        <div className="flex justify-between text-xs mb-4">
                          <span className="font-bold text-green-600">
                            {approvalRate.toFixed(0)}% Aprovação
                          </span>
                          <span className="font-bold text-red-600">
                            {(100 - approvalRate).toFixed(0)}% Rejeição
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant={userVote?.vote_type === 'bomb' ? "destructive" : "outline"}
                            className={cn(
                              "flex-1 border-red-300",
                              userVote?.vote_type === 'bomb' 
                                ? "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600"
                                : "text-red-600 hover:bg-red-50"
                            )}
                            onClick={() => handleVote(post.id, "bomb")}
                          >
                            <Bomb className="mr-2 h-4 w-4"/>
                            Rejeitar ({bombCount})
                          </Button>
                          <Button 
                            variant={userVote?.vote_type === 'heart' ? "default" : "outline"}
                            className={cn(
                              "flex-1 border-green-300",
                              userVote?.vote_type === 'heart' 
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                                : "text-green-600 hover:bg-green-50"
                            )}
                            onClick={() => handleVote(post.id, "heart")}
                          >
                            <Heart className="mr-2 h-4 w-4 fill-current"/>
                            Aprovar ({heartCount})
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {/* Mensagem quando não há posts */}
            {(!posts || posts.length === 0) && (
              <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
                <div className="text-muted-foreground mb-4">
                  <Flame className="h-12 w-12 mx-auto opacity-50" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma postagem em votação</h3>
                <p className="text-sm text-muted-foreground">
                  Todas as postagens já foram votadas. Volte mais tarde!
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - 1/4 largura */}
          <div className="space-y-6">
            {/* Seção Flash */}
            {flashPosts.length > 0 && (
              <Card className="border shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                      <FlashIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Flash em Votação</h3>
                      <p className="text-sm text-muted-foreground">Foto + Áudio</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {flashPosts.slice(0, 3).map((post) => {
                      const mediaUrl = post.media_urls?.[0] ? stripPrefix(post.media_urls[0]) : null;
                      const heartCount = post.post_votes?.filter((v:any) => v.vote_type === 'heart').length || 0;
                      const bombCount = post.post_votes?.filter((v:any) => v.vote_type === 'bomb').length || 0;
                      const isAudio = post.audio_url && isAudioUrl(post.audio_url);
                      
                      return (
                        <div key={post.id} className="flex flex-col gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                          <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted">
                            {mediaUrl && (
                              <ProgressiveImage 
                                src={mediaUrl} 
                                alt="Flash" 
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={post.profiles?.avatar_url} />
                              <AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{post.profiles?.username}</p>
                            </div>
                            {isAudio && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6"
                                onClick={() => handleAudioPlayPause(post.audio_url)}
                              >
                                {playingAudio === post.audio_url ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3 ml-0.5" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-green-600">
                              <Heart className="h-3 w-3 fill-current" />
                              <span>{heartCount}</span>
                            </div>
                            <div className="flex items-center gap-1 text-red-600">
                              <Bomb className="h-3 w-3" />
                              <span>{bombCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seção Clips Sidebar */}
            {clipsPosts.length > 0 && (
              <Card className="border shadow-lg bg-gradient-to-br from-pink-50 to-orange-50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gradient-to-br from-pink-600 to-orange-600 p-2 rounded-lg">
                      <Flame className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Clips em Votação</h3>
                      <p className="text-sm text-muted-foreground">Vídeos curtos</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {clipsPosts.slice(0, 3).map((post) => {
                      const videoUrl = post.media_urls?.[0] ? stripPrefix(post.media_urls[0]) : null;
                      const heartCount = post.post_votes?.filter((v:any) => v.vote_type === 'heart').length || 0;
                      const bombCount = post.post_votes?.filter((v:any) => v.vote_type === 'bomb').length || 0;
                      
                      return (
                        <div key={post.id} className="flex flex-col gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                          <div className="aspect-video rounded-lg overflow-hidden bg-black relative">
                            {videoUrl && (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="text-white h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={post.profiles?.avatar_url} />
                              <AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{post.profiles?.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-green-600">
                              <Heart className="h-3 w-3 fill-current" />
                              <span>{heartCount}</span>
                            </div>
                            <div className="flex items-center gap-1 text-red-600">
                              <Bomb className="h-3 w-3" />
                              <span>{bombCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estatísticas */}
            <Card className="border shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-4">Estatísticas da Arena</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total em votação</span>
                    <span className="font-bold">{posts?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Flash</span>
                    <span className="font-bold text-purple-600">{flashPosts.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Clips</span>
                    <span className="font-bold text-pink-600">{clipsPosts.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">World Flow</span>
                    <span className="font-bold text-blue-600">{standardPosts.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de comentários */}
      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => !o && setOpeningCommentsFor(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            {loadingComments ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Carregando comentários...</p>
              </div>
            ) : comments?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum comentário ainda. Seja o primeiro!</p>
              </div>
            ) : (
              comments?.map((c:any) => (
                <div key={c.id} className="flex gap-3 mb-4 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.author?.avatar_url}/>
                    <AvatarFallback>{c.author?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{c.author?.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Input 
              value={newCommentText} 
              onChange={e => setNewCommentText(e.target.value)} 
              placeholder="Adicione um comentário..." 
              className="rounded-full flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addComment.mutate();
                }
              }}
            />
            <Button 
              size="icon" 
              className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" 
              onClick={() => addComment.mutate()}
              disabled={!newCommentText.trim() || addComment.isPending}
            >
              {addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visualizador de mídia */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-0">
          <div className="relative h-[80vh] flex items-center justify-center">
            {viewerUrl && (
              <>
                {isVideoUrl(viewerUrl) ? (
                  <video 
                    src={viewerUrl} 
                    className="max-h-full max-w-full rounded-lg" 
                    controls 
                    autoPlay 
                  />
                ) : (
                  <img 
                    src={viewerUrl} 
                    alt="Visualização" 
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                )}
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="absolute top-4 right-4 rounded-full" 
                  onClick={()=>setViewerOpen(false)}
                >
                  <Minimize2 className="h-4 w-4"/>
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type PostRow = any;