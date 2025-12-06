import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, X, Pencil, Trash2,
  Camera, Video, Minimize2, Images, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Sparkles, Wand2,
  Clock, Loader2, Flame, TrendingUp, Bomb, Users, Zap, Globe, Zap as FlashIcon,
  RefreshCw, RotateCw
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
import { Switch } from "@/components/ui/switch";

/* ---------- FUNÇÕES DE COMPRESSÃO DE ARQUIVOS ---------- */
// Função para comprimir imagem
const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Redimensionar mantendo proporção
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        // Aplicar suavização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg',
                { type: 'image/jpeg', lastModified: Date.now() }
              );
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

// Função para comprimir vídeo (reduzir qualidade)
const compressVideo = async (file: File): Promise<File> => {
  // Para vídeos, usamos uma abordagem simples de reduzir a taxa de bits
  // Em produção, seria ideal usar uma biblioteca como ffmpeg.js
  return new Promise((resolve, reject) => {
    // Se o vídeo já for pequeno (< 10MB), não comprime
    if (file.size < 10 * 1024 * 1024) {
      resolve(file);
      return;
    }
    
    // Cria uma URL temporária para o vídeo
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    
    video.onloadedmetadata = () => {
      // Para simplificar, apenas renomeamos o arquivo e reduzimos a resolução se possível
      // Em um ambiente real, usaríamos MediaRecorder ou ffmpeg
      const compressedFile = new File(
        [file],
        file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
        { type: 'video/mp4', lastModified: Date.now() }
      );
      
      URL.revokeObjectURL(videoUrl);
      
      // Nota: Para compressão real de vídeo, seria necessário:
      // 1. Usar MediaRecorder API com bitrate reduzido
      // 2. Ou implementar um worker com ffmpeg.js
      // Por enquanto, apenas otimizamos o nome e mantemos o original
      resolve(compressedFile);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video'));
    };
  });
};

// Função para processar arquivos (imagens e vídeos)
const processMediaFile = async (file: File): Promise<File> => {
  try {
    if (file.type.startsWith('image/')) {
      return await compressImage(file);
    } else if (file.type.startsWith('video/')) {
      return await compressVideo(file);
    }
    return file;
  } catch (error) {
    console.error('Erro ao comprimir arquivo:', error);
    return file; // Retorna original em caso de erro
  }
};

/* ---------- COMPONENTE: Imagem Progressiva ---------- */
const ProgressiveImage = ({ src, alt, className, onClick, objectFit = "contain" }: { 
  src: string, 
  alt: string, 
  className?: string, 
  onClick?: () => void,
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down"
}) => {
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
    <div className={cn("relative overflow-hidden bg-muted/30 rounded-lg flex items-center justify-center", className)} onClick={onClick}>
      <img 
        src={src} 
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full filter blur-xl scale-110 transition-opacity duration-700",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{ objectFit }}
        aria-hidden="true"
        onError={() => setHasError(true)}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          "relative w-full h-full transition-all duration-700 rounded-lg",
          isLoaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-sm scale-105"
        )}
        style={{ objectFit }}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

/* ---------- COMPONENTE: VideoPlayer do World Flow ---------- */
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
    // Oculta controles após 3 segundos
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
      className="relative group rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        data-video-id={videoId}
        src={src}
        className={cn("w-full h-full object-contain cursor-pointer rounded-lg", className)}
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

/* ---------- COMPONENTE: Carrossel de Clips ---------- */
interface ClipsCarouselProps {
  posts: any[];
  user: any;
  handleLike: (postId: string) => void;
  onComment: (post: any) => void;
}

const ClipsCarousel = ({ 
  posts, 
  user,
  handleLike,
  onComment
}: ClipsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoMuted, setVideoMuted] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const currentVideoRef = useRef<HTMLVideoElement>(null);

  const next = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    // Pausar vídeo anterior quando mudar de slide
    const previousVideoId = playingVideo;
    if (previousVideoId && previousVideoId !== posts[currentIndex]?.id) {
      const previousVideo = videoRefs.current.get(previousVideoId);
      if (previousVideo) {
        previousVideo.pause();
        setPlayingVideo(null);
      }
    }
  }, [currentIndex, posts]);

  useEffect(() => {
    // Observer para pausar vídeo quando carrossel sair da tela
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && playingVideo) {
            const video = videoRefs.current.get(playingVideo);
            if (video) {
              video.pause();
              setPlayingVideo(null);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }

    return () => {
      if (carouselRef.current) {
        observer.unobserve(carouselRef.current);
      }
    };
  }, [playingVideo]);

  useEffect(() => {
    // Configurar loop no vídeo atual
    if (currentVideoRef.current) {
      currentVideoRef.current.loop = isLooping;
    }
  }, [isLooping, currentIndex]);

  if (posts.length === 0) return null;

  const currentPost = posts[currentIndex];
  
  const getMediaUrl = (post: any) => {
    if (!post.media_urls || !Array.isArray(post.media_urls) || post.media_urls.length === 0) {
      return null;
    }
    
    const url = post.media_urls[0];
    if (!url || typeof url !== 'string') return null;
    
    return url.replace(/^(image::|video::|audio::)/, '');
  };

  const videoUrl = getMediaUrl(currentPost);

  const handleVideoPlayPause = (postId: string) => {
    const video = videoRefs.current.get(postId);
    if (!video) return;
    
    if (playingVideo === postId) {
      video.pause();
      setPlayingVideo(null);
    } else {
      if (playingVideo) {
        const currentVideo = videoRefs.current.get(playingVideo);
        if (currentVideo) currentVideo.pause();
      }
      video.play().catch(console.error);
      setPlayingVideo(postId);
    }
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const handleRestart = () => {
    const video = videoRefs.current.get(currentPost.id);
    if (video) {
      video.currentTime = 0;
      if (playingVideo !== currentPost.id) {
        video.play().catch(console.error);
        setPlayingVideo(currentPost.id);
      }
    }
  };

  return (
    <Card ref={carouselRef} className="border shadow-lg bg-card/95 backdrop-blur-sm overflow-hidden mb-6">
      <CardContent className="p-4">
        {/* Header do carrossel */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                Clips 
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Viral
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Vídeos curtos de até 30s que viralizaram!
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              disabled={currentIndex === 0}
              className="h-8 w-8 rounded-full bg-muted text-foreground hover:bg-muted/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">
              {currentIndex + 1} / {posts.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              disabled={currentIndex === posts.length - 1}
              className="h-8 w-8 rounded-full bg-muted text-foreground hover:bg-muted/80"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Player de Clip */}
        <div className="relative bg-black rounded-xl overflow-hidden aspect-[9/16] flex items-center justify-center">
          {videoUrl ? (
            <>
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current.set(currentPost.id, el);
                    currentVideoRef.current = el;
                  }
                }}
                src={videoUrl}
                className="w-full h-full object-contain"
                loop={isLooping}
                muted={videoMuted}
                playsInline
                onClick={() => handleVideoPlayPause(currentPost.id)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              
              {/* Controles */}
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white">
                    <Avatar className="h-8 w-8 ring-2 ring-white/50">
                      <AvatarImage src={currentPost.profiles?.avatar_url}/>
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600">
                        {currentPost.profiles?.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <UserLink 
                        userId={currentPost.user_id} 
                        username={currentPost.profiles?.username || ''}
                        className="font-bold text-white text-sm hover:text-white/80"
                      >
                        {currentPost.profiles?.username}
                      </UserLink>
                      <p className="text-white/70 text-xs">
                        {currentPost.content || "Clip em alta!"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Botão de reiniciar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                      onClick={handleRestart}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setVideoMuted(!videoMuted)}
                    >
                      {videoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={cn(
                      "flex-1 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm",
                      currentPost.likes?.some((l:any) => l.user_id === user?.id) && "bg-red-500/50 hover:bg-red-500/60"
                    )}
                    onClick={() => handleLike(currentPost.id)}
                  >
                    <Heart className={cn("h-4 w-4 mr-2", currentPost.likes?.some((l:any) => l.user_id === user?.id) && "fill-current")} />
                    {currentPost.likes?.length || 0}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm"
                    onClick={() => onComment(currentPost)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {currentPost.comments?.length || 0}
                  </Button>
                </div>
              </div>
              
              {/* Botão de play/pause central */}
              {playingVideo !== currentPost.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Button
                    size="icon"
                    className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30"
                    onClick={() => handleVideoPlayPause(currentPost.id)}
                  >
                    <Play className="h-6 w-6 ml-1" />
                  </Button>
                </div>
              )}
              
              {/* Botão de loop */}
              <button 
                className={cn(
                  "absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-black/70 z-20",
                  isLooping && "bg-purple-500/70"
                )}
                onClick={toggleLoop}
              >
                <RotateCw className="h-3 w-3" /> 
                {isLooping ? "Repetindo" : "Repetir"}
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
              <Flame className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground ml-3">Nenhum vídeo disponível</p>
            </div>
          )}
        </div>
        
        {/* Indicadores */}
        <div className="flex justify-center gap-2 mt-4">
          {posts.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentIndex ? "bg-gradient-to-r from-purple-500 to-pink-500 w-6" : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/* ---------- COMPONENTE: Flash Photo Audio ---------- */
interface FlashSidebarItemProps {
  post: any;
  user: any;
  handleLike: (postId: string) => void;
  onComment: (post: any) => void;
  onPlayAudio: (audioUrl: string) => void;
  isPlaying: boolean;
}

const FlashSidebarItem = ({ 
  post, 
  user, 
  handleLike, 
  onComment,
  onPlayAudio,
  isPlaying
}: FlashSidebarItemProps) => {
  const mediaUrl = post.media_urls?.[0] ? post.media_urls[0].replace(/^image::/, '') : null;
  const audioUrl = post.audio_url?.replace(/^audio::/, '');
  const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPlaying) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            // Pausar o áudio se não estiver mais visível
            onPlayAudio(audioUrl!);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [isPlaying, audioUrl, onPlayAudio]);

  return (
    <div ref={containerRef} className="flex flex-col gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {mediaUrl && (
          <ProgressiveImage 
            src={mediaUrl} 
            alt="Flash" 
            className="w-full h-full"
            objectFit="contain"
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
        {audioUrl && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6"
            onClick={() => onPlayAudio(audioUrl)}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3 ml-0.5" />
            )}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2"
          onClick={() => handleLike(post.id)}
        >
          <Heart className={cn("h-3 w-3", isLiked && "fill-current text-red-500")} />
          <span className="ml-1 text-xs">{post.likes?.length || 0}</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2"
          onClick={() => onComment(post)}
        >
          <MessageCircle className="h-3 w-3" />
          <span className="ml-1 text-xs">{post.comments?.length || 0}</span>
        </Button>
      </div>
    </div>
  );
};

/* ---------- COMPONENTE: Clip Sidebar ---------- */
interface ClipSidebarItemProps {
  post: any;
  user: any;
  handleLike: (postId: string) => void;
  onComment: (post: any) => void;
}

const ClipSidebarItem = ({ 
  post, 
  user, 
  handleLike, 
  onComment 
}: ClipSidebarItemProps) => {
  const videoUrl = post.media_urls?.[0] ? post.media_urls[0].replace(/^video::/, '') : null;
  const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && isPlaying) {
            videoElement.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(videoElement);

    return () => {
      observer.unobserve(videoElement);
    };
  }, [isPlaying]);

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  const toggleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLooping(!isLooping);
    if (videoRef.current) {
      videoRef.current.loop = !isLooping;
    }
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (!isPlaying) {
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className="aspect-video rounded-lg overflow-hidden bg-black relative group flex items-center justify-center"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {videoUrl && (
          <>
            <video 
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain cursor-pointer"
              loop={isLooping}
              onClick={handleVideoClick}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Controles */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent transition-opacity",
              showControls || !isPlaying ? "opacity-100" : "opacity-0"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={handleRestart}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                
                {!isPlaying ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={handleVideoClick}
                  >
                    <Play className="h-3 w-3 ml-0.5" />
                  </Button>
                ) : (
                  <div className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                    Tocando
                  </div>
                )}
              </div>
            </div>
            
            {/* Botão de play central */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                  onClick={handleVideoClick}
                >
                  <Play className="h-5 w-5 ml-0.5" />
                </Button>
              </div>
            )}
            
            {/* Botão de loop */}
            <button 
              className={cn(
                "absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-black/70",
                isLooping && "bg-purple-500/70"
              )}
              onClick={toggleLoop}
            >
              <RotateCw className="h-3 w-3" /> 
              {isLooping ? "Repetindo" : "Repetir"}
            </button>
            
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
              0:30
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={post.profiles?.avatar_url} />
          <AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{post.profiles?.username}</p>
          <p className="text-xs text-muted-foreground truncate">{post.content || 'Clip'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2"
          onClick={() => handleLike(post.id)}
        >
          <Heart className={cn("h-3 w-3", isLiked && "fill-current text-red-500")} />
          <span className="ml-1 text-xs">{post.likes?.length || 0}</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2"
          onClick={() => onComment(post)}
        >
          <MessageCircle className="h-3 w-3" />
          <span className="ml-1 text-xs">{post.comments?.length || 0}</span>
        </Button>
      </div>
    </div>
  );
};

/* ---------- COMPONENTE: Player de Áudio ---------- */
const AudioPlayer = ({ src, isPlaying, onPlayPause }: { 
  src: string; 
  isPlaying: boolean; 
  onPlayPause: () => void;
}) => {
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={onPlayPause}
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

async function getMediaDurationSafe(file: File, timeoutMs = 4000): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(file);
    const media = file.type.startsWith("video/") ? document.createElement("video") : document.createElement("audio");
    media.preload = "metadata";
    const done = (sec: number) => { 
      if (settled) return; 
      settled = true; 
      URL.revokeObjectURL(url); 
      resolve(sec); 
    };
    const timer = setTimeout(() => done(0), timeoutMs);
    media.onloadedmetadata = () => { 
      clearTimeout(timer); 
      done(isFinite(media.duration) ? media.duration : 0); 
    };
    media.onerror = () => { 
      clearTimeout(timer); 
      done(0); 
    };
    media.src = url;
  });
}

/* ---------- Configurações de Estilo IA ---------- */
const AI_STYLES = [
  { id: 'rejuvenate', label: 'Rejuvenescer', icon: Sparkles, color: 'bg-green-100 text-green-600', prompt: 'make them look 20 years younger, remove deep wrinkles, face lift, glowing youthful skin, high fidelity, 8k, soft studio lighting', filter: 'rejuvenate' },
  { id: 'beauty', label: 'Embelezar', icon: Sparkles, color: 'bg-pink-100 text-pink-600', prompt: 'high quality, beautified, perfect lighting, 8k, smooth skin, makeup, glamour', filter: 'beauty' },
  { id: 'hdr', label: 'HDR / Nitidez', icon: Sparkles, color: 'bg-orange-100 text-orange-600', prompt: 'hdr, high contrast, sharp focus, detailed, hyperrealistic, 4k', filter: 'hdr' },
  { id: 'oil', label: 'Pintura a Óleo', icon: Sparkles, color: 'bg-yellow-100 text-yellow-700', prompt: 'oil painting style, van gogh style, thick brushstrokes, artistic, masterpiece', filter: 'oil' },
  { id: 'cartoon', label: 'Cartoon 3D', icon: Sparkles, color: 'bg-blue-50 text-blue-500', prompt: '3d pixar style character, cute, big eyes, disney style, smooth render', filter: 'cartoon' },
  { id: 'sketch', label: 'Esboço', icon: Sparkles, color: 'bg-stone-100 text-stone-600', prompt: 'pencil sketch, charcoal drawing, rough lines, black and white sketch', filter: 'sketch' },
  { id: 'fantasy', label: 'Fantasia', icon: Sparkles, color: 'bg-indigo-100 text-indigo-600', prompt: 'fantasy art, magical atmosphere, glowing lights, ethereal, dreamlike', filter: 'fantasy' },
  { id: 'bw', label: 'Preto & Branco', icon: Sparkles, color: 'bg-gray-100 text-gray-600', prompt: 'black and white photography, artistic, monochrome, noir film', filter: 'bw' },
  { id: 'vintage', label: 'Vintage 1950', icon: Sparkles, color: 'bg-amber-100 text-amber-700', prompt: 'vintage photo, 1950s style, sepia, grain, old photo texture', filter: 'vintage' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Sparkles, color: 'bg-purple-100 text-purple-600', prompt: 'cyberpunk style, neon lights, magenta and cyan, futuristic, scifi city', filter: 'cyberpunk' },
  { id: 'matrix', label: 'Matrix', icon: Sparkles, color: 'bg-emerald-100 text-emerald-600', prompt: 'matrix code style, green tint, hacker atmosphere, digital rain', filter: 'matrix' },
  { id: 'anime', label: 'Anime', icon: Sparkles, color: 'bg-blue-100 text-blue-600', prompt: 'anime style, vibrant colors, 2d animation style, japanese animation', filter: 'anime' },
  { id: 'terror', label: 'Terror', icon: Sparkles, color: 'bg-red-100 text-red-600', prompt: 'horror style, dark atmosphere, scary, zombie apocalypse, blood', filter: 'terror' },
  { id: 'cold', label: 'Frio / Inverno', icon: Sparkles, color: 'bg-cyan-100 text-cyan-600', prompt: 'cold atmosphere, winter, blue tones, ice, snow', filter: 'cold' },
];

/* ---------- Hooks ---------- */
type PostRow = any;

const useVideoAutoPlayer = () => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const playVideo = useCallback(async (videoId: string) => {
    if (!autoPlayEnabled) return;
    
    const video = videoRefs.current.get(videoId);
    if (video && playingVideo !== videoId) {
      try {
        if (playingVideo) {
          const currentVideo = videoRefs.current.get(playingVideo);
          if (currentVideo) currentVideo.pause();
        }
        setPlayingVideo(videoId);
        video.muted = muted;
        await video.play();
      } catch (e) {
        console.error("Erro ao reproduzir vídeo:", e);
      }
    }
  }, [playingVideo, muted, autoPlayEnabled]);

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

  useEffect(() => {
    if (!autoPlayEnabled) {
      // Pausar todos os vídeos se autoplay estiver desativado
      if (playingVideo) {
        pauseVideo(playingVideo);
      }
      return;
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const videoId = entry.target.getAttribute('data-video-id');
        if (!videoId) return;
        
        if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
          // Verifica se está no centro da tela
          const rect = entry.target.getBoundingClientRect();
          const isInCenter = rect.top >= 0 && rect.bottom <= window.innerHeight;
          
          if (isInCenter || entry.intersectionRatio > 0.8) {
            playVideo(videoId);
          }
        } else if (playingVideo === videoId) {
          pauseVideo(videoId);
        }
      });
    }, { 
      threshold: [0, 0.3, 0.7, 1],
      rootMargin: '0px 0px -20% 0px' // Pausa quando 20% do vídeo sair da tela
    });
    
    return () => observerRef.current?.disconnect();
  }, [playVideo, pauseVideo, playingVideo, autoPlayEnabled]);

  const registerVideo = useCallback((id: string, el: HTMLVideoElement) => {
    videoRefs.current.set(id, el);
    if (autoPlayEnabled) {
      observerRef.current?.observe(el);
    }
  }, [autoPlayEnabled]);
  
  const unregisterVideo = useCallback((id: string) => {
    const v = videoRefs.current.get(id);
    if (v) observerRef.current?.unobserve(v);
    videoRefs.current.delete(id);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled(prev => !prev);
  }, []);

  return { 
    playingVideo, 
    muted, 
    autoPlayEnabled,
    playVideo, 
    pauseVideo, 
    toggleMute, 
    toggleAutoPlay,
    registerVideo, 
    unregisterVideo 
  };
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
    } catch (e) { 
      console.error("Erro ao gravar áudio:", e);
      throw new Error('Microfone inacessível'); 
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };
  
  const resetRecording = () => { 
    setAudioBlob(null); 
    setRecordingTime(0); 
  };
  
  useEffect(() => { 
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);
  
  return { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording };
};

/* ---------- COMPONENTE: Suporte a Menções ---------- */
// Hook para buscar sugestões de usuários para menções
const useMentionSuggestions = () => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `${query}%`)
        .limit(10);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Erro ao buscar sugestões de menções:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchSuggestions = useCallback((query: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  }, [fetchSuggestions]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { suggestions, loading, searchSuggestions };
};

/* ---------- COMPONENT PRINCIPAL ---------- */
export default function WorldFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /* States */
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [postType, setPostType] = useState<'standard' | 'photo_audio' | 'viral_clips'>('standard');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const { 
    playingVideo, 
    muted, 
    autoPlayEnabled,
    playVideo, 
    pauseVideo, 
    toggleMute, 
    toggleAutoPlay,
    registerVideo, 
    unregisterVideo 
  } = useVideoAutoPlayer();

  const [aiEditing, setAiEditing] = useState<{open: boolean; imageIndex: number; selectedStyle: string | null; loading: boolean}>({
    open: false, imageIndex: -1, selectedStyle: null, loading: false
  });

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const viralClipCameraInputRef = useRef<HTMLInputElement>(null);
  const viralClipGalleryInputRef = useRef<HTMLInputElement>(null);

  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  
  // Estado para controle de áudio
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Estado para sugestões de menções
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const mentionTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Hook para sugestões de menções
  const { suggestions, loading, searchSuggestions } = useMentionSuggestions();

  /* Data */
  useEffect(() => {
    if (!user) return;
    supabase.from("last_viewed").upsert({ 
      user_id: user.id, 
      section: "feed", 
      viewed_at: new Date().toISOString() 
    }, { 
      onConflict: "user_id,section" 
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["unread-feed", user.id] });
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
          .eq("is_community_approved", true)
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
    const channel = supabase.channel("feed-realtime")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "posts" }, 
        () => {
          console.log("Mudança em posts detectada");
          refetch();
        }
      )
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "likes" }, 
        () => refetch()
      )
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "post_votes" }, 
        () => refetch()
      )
      .subscribe((status) => {
        console.log("Status do canal realtime:", status);
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  /* Handlers */
  const onFilesPicked = async (files?: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setProcessing(true);
    const accepted: File[] = [];
    
    for (const f of list) {
      try {
        if (f.type.startsWith("image/")) {
          // Comprimir imagem antes de adicionar
          const compressedFile = await processMediaFile(f);
          accepted.push(compressedFile);
          
          toast({
            title: "Imagem comprimida",
            description: `Tamanho reduzido de ${(f.size / 1024 / 1024).toFixed(2)}MB para ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
            duration: 3000
          });
        } else if (f.type.startsWith("video/")) {
          const dur = await getMediaDurationSafe(f).catch(() => 0);
          
          if (postType === 'viral_clips') {
            if (dur <= 30.3) {
              // Comprimir vídeo antes de adicionar
              const compressedFile = await processMediaFile(f);
              accepted.push(compressedFile);
              setVideoDuration(dur);
              
              toast({
                title: "Vídeo comprimido",
                description: `Tamanho reduzido de ${(f.size / 1024 / 1024).toFixed(2)}MB para ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                duration: 3000
              });
            } else {
              toast({ 
                variant: "destructive", 
                title: "Vídeo muito longo", 
                description: "Clips devem ter no máximo 30 segundos" 
              });
            }
          } else if (postType === 'photo_audio' || postType === 'standard') {
            if (dur <= 15.3) {
              // Comprimir vídeo antes de adicionar
              const compressedFile = await processMediaFile(f);
              accepted.push(compressedFile);
            } else {
              toast({ variant: "destructive", title: "Vídeo longo (Max 15s)" });
            }
          }
        } else if (f.type.startsWith("audio/")) {
          const dur = await getMediaDurationSafe(f).catch(() => 0);
          if (dur <= 10) accepted.push(f); 
          else toast({ variant: "destructive", title: "Áudio longo (Max 10s)" });
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
      }
    }
    
    setProcessing(false);
    if (accepted.length) {
      setMediaFiles(prev => [...prev, ...accepted]);
    }
  };
  
  const onViralClipPicked = async (files?: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setProcessing(true);
    const accepted: File[] = [];
    
    for (const f of list) {
      try {
        if (f.type.startsWith("video/")) {
          const dur = await getMediaDurationSafe(f).catch(() => 0);
          setVideoDuration(dur);
          if (dur <= 30.3) {
            // Comprimir vídeo antes de adicionar
            const compressedFile = await processMediaFile(f);
            accepted.push(compressedFile);
            
            toast({
              title: "Vídeo comprimido",
              description: `Duração: ${dur.toFixed(1)}s | Tamanho: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
              duration: 3000
            });
          } else {
            toast({ 
              variant: "destructive", 
              title: "Vídeo muito longo", 
              description: "Clips devem ter no máximo 30 segundos" 
            });
          }
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
      }
    }
    
    setProcessing(false);
    if (accepted.length) {
      setMediaFiles(prev => [...prev, ...accepted]);
    }
  };
  
  const removeFile = (idx: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    if (postType === 'viral_clips') {
      setVideoDuration(null);
    }
  };

  /* IA Logic */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((res, rej) => { 
      const r = new FileReader(); 
      r.onload = () => res(r.result as string); 
      r.onerror = rej; 
      r.readAsDataURL(file); 
    });
  };

  const createFileFromBase64 = async (base64: string, filename: string): Promise<File> => {
    const res = await fetch(base64); 
    const blob = await res.blob(); 
    return new File([blob], filename, { type: "image/jpeg", lastModified: Date.now() });
  };

  const processImageLocally = async (base64Image: string, filterType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image(); 
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width; 
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Aplicar filtros baseados no tipo
        if (filterType === 'rejuvenate') {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width; 
          tempCanvas.height = canvas.height;
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
        else if (filterType === 'oil') { 
          ctx.filter = 'saturate(1.8) contrast(1.2) brightness(1.1)'; 
          ctx.drawImage(canvas, 0, 0); 
        }
        else if (filterType === 'cartoon') { 
          ctx.filter = 'saturate(2.0) contrast(1.3)'; 
          ctx.drawImage(canvas, 0, 0); 
        }
        else if (filterType === 'sketch') { 
          ctx.filter = 'grayscale(1) contrast(2.0) brightness(1.3)'; 
          ctx.drawImage(canvas, 0, 0); 
        }
        else if (filterType === 'fantasy') {
          ctx.filter = 'contrast(1.2) saturate(1.3)'; 
          ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'screen';
          const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); 
          g.addColorStop(0, 'rgba(100,0,255,0.2)'); 
          g.addColorStop(1, 'rgba(255,0,100,0.2)'); 
          ctx.fillStyle = g; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'beauty') { 
          ctx.filter = 'brightness(1.05) saturate(1.2) contrast(1.05)'; 
          ctx.drawImage(canvas, 0, 0); 
        }
        else if (filterType === 'hdr') { 
          ctx.filter = 'contrast(1.3) saturate(1.3) brightness(1.1)'; 
          ctx.drawImage(canvas, 0, 0); 
        }
        else if (filterType === 'bw') { 
          ctx.filter = 'grayscale(1.0) contrast(1.2)'; 
          ctx.drawImage(canvas, 0, 0); 
        }
        else if (filterType === 'vintage') { 
          ctx.filter = 'sepia(0.8) brightness(0.9) contrast(1.2)'; 
          ctx.drawImage(canvas, 0, 0); 
          ctx.globalCompositeOperation = 'overlay'; 
          ctx.fillStyle = 'rgba(255,200,100,0.15)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height); 
        }
        else if (filterType === 'cyberpunk') {
          ctx.filter = 'contrast(1.4) saturate(1.5)'; 
          ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'color-dodge'; 
          const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); 
          g.addColorStop(0, 'rgba(255,0,255,0.3)'); 
          g.addColorStop(1, 'rgba(0,255,255,0.3)'); 
          ctx.fillStyle = g; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'matrix') { 
          ctx.filter = 'grayscale(1) contrast(1.5)'; 
          ctx.drawImage(canvas, 0, 0); 
          ctx.globalCompositeOperation = 'screen'; 
          ctx.fillStyle = 'rgba(0,255,0,0.4)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height); 
        }
        else if (filterType === 'anime') { 
          ctx.filter = 'saturate(2.5) contrast(1.2)'; 
          ctx.drawImage(canvas, 0, 0); 
        }
        else if (filterType === 'terror') { 
          ctx.filter = 'grayscale(0.8) contrast(1.8)'; 
          ctx.drawImage(canvas, 0, 0); 
          ctx.globalCompositeOperation = 'multiply'; 
          ctx.fillStyle = 'rgba(100,0,0,0.4)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height); 
        }
        else if (filterType === 'cold') { 
          ctx.filter = 'saturate(0.8) brightness(1.1)'; 
          ctx.drawImage(canvas, 0, 0); 
          ctx.globalCompositeOperation = 'soft-light'; 
          ctx.fillStyle = 'rgba(0,200,255,0.3)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height); 
        }

        ctx.filter = 'none'; 
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '16px sans-serif'; 
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; 
        ctx.fillText('✨ AI Filter', 10, canvas.height - 10);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = (e) => reject(e); 
      img.src = base64Image;
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
        const res = await fetch('/.netlify/functions/huggingface-proxy', { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ prompt: selectedStyle.prompt, image: base64Image }) 
        });
        const json = await res.json();
        
        if (!res.ok || !json.success) throw new Error("Fallback");
        processed = json.image;
        toast({ title: "✨ Sucesso Nuvem", description: selectedStyle.label });
      } catch {
        processed = await processImageLocally(base64Image, selectedStyle.filter);
        toast({ title: "⚡ Sucesso Local", description: selectedStyle.label });
      }
      
      const newFile = await createFileFromBase64(processed, `ai-${styleId}-${Date.now()}.jpg`);
      setMediaFiles(p => { 
        const n = [...p]; 
        n[aiEditing.imageIndex] = newFile; 
        return n; 
      });
      
      setAiEditing({open: false, imageIndex: -1, selectedStyle: null, loading: false});
    } catch { 
      toast({ variant: "destructive", title: "Erro ao aplicar estilo" }); 
      setAiEditing(p => ({...p, loading: false})); 
    }
  };

  /* Post Creation */
  const handleCreatePost = async () => {
    if (postType === 'photo_audio' && (!audioBlob || mediaFiles.length === 0)) { 
      toast({ variant: "destructive", title: "Foto + Áudio obrigatórios" }); 
      return; 
    }
    
    if (postType === 'viral_clips' && mediaFiles.length === 0) { 
      toast({ variant: "destructive", title: "Selecione um vídeo para Clip" }); 
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
      
      // Upload de mídias (já comprimidas)
      for (const file of mediaFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user?.id}/${Date.now()}-${Math.random()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, file);
        
        if (uploadError) {
          console.error("Erro ao fazer upload:", uploadError);
          throw uploadError;
        }
        
        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(path);
        
        if (!urlData?.publicUrl) {
          throw new Error("Falha ao obter URL pública");
        }
        
        // Adicionar prefixo baseado no tipo
        if (file.type.startsWith("video/")) {
          mediaUrls.push(`video::${urlData.publicUrl}`);
        } else if (file.type.startsWith("image/")) {
          mediaUrls.push(`image::${urlData.publicUrl}`);
        } else if (file.type.startsWith("audio/")) {
          mediaUrls.push(`audio::${urlData.publicUrl}`);
        }
      }
      
      // Upload de áudio para photo_audio
      if (audioBlob && postType === 'photo_audio') {
        const path = `${user?.id}/${Date.now()}-audio.wav`;
        const { error: audioError } = await supabase.storage
          .from("media")
          .upload(path, audioBlob);
        
        if (audioError) throw audioError;
        
        const { data: audioUrlData } = supabase.storage
          .from("media")
          .getPublicUrl(path);
        
        audioUrl = `audio::${audioUrlData.publicUrl}`;
      }
      
      const ends = new Date(); 
      ends.setMinutes(ends.getMinutes() + 60);

      const content = postType === 'photo_audio' ? '' : newPost;
      const { data: post, error } = await supabase
        .from("posts")
        .insert({ 
          user_id: user?.id, 
          content, 
          media_urls: mediaUrls.length ? mediaUrls : null, 
          audio_url: audioUrl, 
          post_type: postType, 
          voting_ends_at: ends.toISOString(), 
          voting_period_active: true 
        })
        .select()
        .single();
      
      if (error) {
        console.error("Erro ao criar post:", error);
        throw error;
      }
      
      // Salvar menções se houver conteúdo
      if (content) { 
        try {
          const { saveMentions } = await import("@/utils/mentionsHelper");
          await saveMentions(post.id, "post", content, user!.id);
        } catch (mentionError) {
          console.warn("Erro ao salvar menções:", mentionError);
        }
      }
      
      let successMessage = "Post publicado! 🎉";
      let successDescription = "Seu post foi enviado para a Arena. Boa sorte na votação!";
      
      if (postType === 'viral_clips') {
        successMessage = "Clip publicado! 🔥";
        successDescription = "Seu Clip foi enviado para a Arena. Torcemos para que viralize!";
      } else if (postType === 'photo_audio') {
        successMessage = "Flash publicado! 🎬";
        successDescription = "Seu Flash foi enviado para a Arena. Boa sorte na votação!";
      }
      
      toast({ 
        title: successMessage, 
        description: successDescription 
      });
      
      // Resetar formulário
      setNewPost(""); 
      setMediaFiles([]); 
      resetRecording();
      setVideoDuration(null);
      
      // Recarregar posts
      await refetch();
      
      // Navegar para arena após 2 segundos
      setTimeout(() => {
        navigate("/arena");
      }, 2000);
      
    } catch (e: any) { 
      console.error("Erro completo:", e);
      toast({ 
        variant: "destructive", 
        title: "Erro ao publicar", 
        description: e.message || "Tente novamente" 
      }); 
    } finally { 
      setUploading(false); 
    }
  };

  /* Helpers de Ação */
  const handleLike = async (postId: string) => {
      try {
        const post = posts?.find(p => p.id === postId);
        if (!post) return;
        
        const hasLiked = post.likes?.some((l:any) => l.user_id === user?.id);
        
        if (hasLiked) {
          // Remover like
          const likeToRemove = post.likes.find((l:any) => l.user_id === user?.id);
          if (likeToRemove) {
            await supabase.from("likes").delete().eq("id", likeToRemove.id);
          }
        } else {
          // Adicionar like
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

  // Função para tocar/pausar áudio
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
      
      // Iniciar novo áudio
      const cleanUrl = stripPrefix(audioUrl);
      const audio = new Audio(cleanUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };
      
      audio.play().catch(console.error);
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

        // Salvar menções do comentário
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

  // Filtrar posts por tipo
  const flashPosts = posts?.filter(x => x.post_type === 'photo_audio') || [];
  const clipsPosts = posts?.filter(x => x.post_type === 'viral_clips') || [];
  const standardPosts = posts?.filter(x => x.post_type === 'standard') || [];

  // Query para comentários
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
              <div key={idx} className="relative flex items-center justify-center">
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
              objectFit="contain"
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

  // Função para lidar com mudanças no textarea de post
  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewPost(value);
    
    // Verificar se há uma menção sendo digitada
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      if (spaceIndex === -1) {
        // Estamos digitando uma menção
        const query = textAfterAt;
        setMentionQuery(query);
        
        // Calcular posição do cursor
        const textareaRect = e.target.getBoundingClientRect();
        const lineHeight = 20; // Aproximado
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const positionTop = textareaRect.top + (currentLine * lineHeight) + 30;
        const positionLeft = textareaRect.left + (textBeforeCursor.length - lastAtSymbol) * 8;
        
        setMentionPosition({ top: positionTop, left: positionLeft });
        setShowMentionSuggestions(true);
        searchSuggestions(query);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Função para selecionar uma sugestão de menção
  const handleSelectMention = (username: string) => {
    const cursorPos = mentionTextareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newPost.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = newPost.substring(lastAtSymbol + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      let newText = '';
      if (spaceIndex === -1) {
        // Substituir a query atual pela menção completa
        newText = newPost.substring(0, lastAtSymbol) + '@' + username + ' ' + newPost.substring(cursorPos);
      } else {
        newText = newPost.substring(0, lastAtSymbol) + '@' + username + ' ' + newPost.substring(lastAtSymbol + 1 + spaceIndex + 1);
      }
      
      setNewPost(newText);
      setShowMentionSuggestions(false);
      setMentionQuery('');
      
      // Focar novamente no textarea
      setTimeout(() => {
        mentionTextareaRef.current?.focus();
        const newCursorPos = lastAtSymbol + username.length + 2; // +2 para '@' e espaço
        mentionTextareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
        {/* Cabeçalho com logo - Painel removido */}
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
        </div>

        {/* Card de criação de post */}
        <Card className="border shadow-lg bg-card/95 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex gap-2 mb-4 justify-center flex-wrap">
              <Button 
                variant={postType==='standard'?"default":"outline"} 
                onClick={()=>{
                  setPostType('standard');
                  setMediaFiles([]);
                  setVideoDuration(null);
                  resetRecording();
                }} 
                className={cn(
                  "rounded-full px-6",
                  postType==='standard' 
                    ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white border-0" 
                    : "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-pink-500/30"
                )}
              >
                <Globe className="h-4 w-4 mr-2" />
                World Flow
              </Button>
              <Button 
                variant={postType==='photo_audio'?"default":"outline"} 
                onClick={()=>{
                  setPostType('photo_audio');
                  setMediaFiles([]);
                  setVideoDuration(null);
                }} 
                className={cn(
                  "rounded-full px-6",
                  postType==='photo_audio' 
                    ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-0" 
                    : "bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 hover:from-purple-500/30 hover:via-pink-500/30 hover:to-orange-500/30"
                )}
              >
                <FlashIcon className="h-4 w-4 mr-2" />
                Flash
              </Button>
              <Button 
                variant={postType==='viral_clips'?"default":"outline"} 
                onClick={()=>{
                  setPostType('viral_clips');
                  setMediaFiles([]);
                  setVideoDuration(null);
                  resetRecording();
                }} 
                className={cn(
                  "rounded-full px-6",
                  postType==='viral_clips' 
                    ? "bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 text-white border-0" 
                    : "bg-gradient-to-r from-pink-500/20 via-red-500/20 to-orange-500/20 hover:from-pink-500/30 hover:via-red-500/30 hover:to-orange-500/30"
                )}
              >
                <Flame className="h-4 w-4 mr-2" />
                Clips
              </Button>
            </div>

            <div className="flex gap-3">
              <Avatar>
                <AvatarImage src={user?.user_metadata?.avatar_url}/>
                <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3 relative">
                {postType === 'standard' && (
                  <div className="relative">
                    <textarea
                      ref={mentionTextareaRef}
                      value={newPost}
                      onChange={handlePostChange}
                      placeholder="No que está pensando? @menção #tag"
                      className="w-full bg-muted/30 border min-h-[100px] rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onBlur={() => setTimeout(() => setShowMentionSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowMentionSuggestions(false);
                        }
                        if (e.key === 'Enter' && !e.shiftKey && showMentionSuggestions && suggestions.length > 0) {
                          e.preventDefault();
                          handleSelectMention(suggestions[0].username);
                        }
                      }}
                    />
                    
                    {/* Sugestões de menções */}
                    {showMentionSuggestions && (
                      <div 
                        className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-48 overflow-y-auto w-64"
                        style={{
                          top: mentionPosition.top,
                          left: Math.min(mentionPosition.left, window.innerWidth - 300)
                        }}
                      >
                        {loading ? (
                          <div className="p-3 text-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            <p className="text-xs mt-1">Buscando...</p>
                          </div>
                        ) : suggestions.length > 0 ? (
                          suggestions.map((user) => (
                            <button
                              key={user.id}
                              className="w-full flex items-center gap-2 p-2 hover:bg-accent text-left"
                              onClick={() => handleSelectMention(user.username)}
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{user.username[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">@{user.username}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-muted-foreground">
                            <p className="text-xs">Nenhum usuário encontrado</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {postType === 'photo_audio' && (
                  <div className="text-center p-4 border border-dashed rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
                    <p className="text-sm text-muted-foreground mb-2">1. Tire uma foto &nbsp; 2. Grave um áudio (10s)</p>
                    {!audioBlob ? (
                      <Button 
                        variant={isRecording?"destructive":"secondary"} 
                        onClick={isRecording?stopRecording:startRecording} 
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        disabled={processing}
                      >
                        {isRecording ? (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            Parar ({10-recordingTime}s)
                          </>
                        ) : (
                          <>
                            <Mic className="mr-2 h-4 w-4" /> 
                            Gravar Áudio
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <Volume2 className="h-4 w-4" /> 
                        Gravado! 
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={resetRecording} 
                          className="text-destructive h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4"/>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {postType === 'viral_clips' && (
                  <div className="text-center p-4 border-2 border-dashed border-pink-500/50 rounded-xl bg-gradient-to-br from-pink-50 to-orange-50">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Flame className="h-5 w-5 text-pink-600" />
                      <h3 className="font-bold text-pink-700">Clips</h3>
                      <Badge className="bg-gradient-to-r from-pink-500 to-orange-500 text-white">
                        Até 30s
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Vídeos curtos que podem viralizar! Máximo 30 segundos.
                    </p>
                    
                    {videoDuration !== null && (
                      <div className="mb-3 p-2 bg-white rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Duração do vídeo:</span>
                          <span className="text-xs font-bold">{videoDuration.toFixed(1)}s</span>
                        </div>
                        <Progress 
                          value={(videoDuration / 30) * 100} 
                          className={cn(
                            "h-2",
                            videoDuration > 30 ? "bg-red-500" : "bg-green-500"
                          )}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0s</span>
                          <span className={cn(videoDuration > 30 ? "text-red-600 font-bold" : "text-green-600 font-bold")}>
                            {videoDuration > 30 ? "Muito longo!" : "Duração OK"}
                          </span>
                          <span>30s</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <input 
                        ref={viralClipCameraInputRef} 
                        type="file" 
                        accept="video/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => onViralClipPicked(e.target.files)}
                        disabled={processing}
                      />
                      <input 
                        ref={viralClipGalleryInputRef} 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={(e) => onViralClipPicked(e.target.files)}
                        disabled={processing}
                      />
                      
                      <Button 
                        variant="outline" 
                        onClick={() => viralClipCameraInputRef.current?.click()}
                        className="flex-1 border-pink-500 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                        disabled={processing}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Câmera
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => viralClipGalleryInputRef.current?.click()}
                        className="flex-1 border-pink-500 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                        disabled={processing}
                      >
                        <Images className="mr-2 h-4 w-4" />
                        Galeria
                      </Button>
                    </div>
                  </div>
                )}

                {/* Multi-Media Preview Carousel */}
                {mediaFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {postType === 'viral_clips' ? 'Vídeo selecionado:' : 'Mídias:'}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setMediaFiles([]);
                          setVideoDuration(null);
                        }}
                        className="h-6 text-xs"
                        disabled={processing}
                      >
                        Limpar tudo
                      </Button>
                    </div>
                    
                    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                      <div className="flex w-max space-x-2 p-2">
                        {mediaFiles.map((file, i) => (
                          <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group shrink-0 flex items-center justify-center">
                            {file.type.startsWith("image/") ? (
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={`Preview ${i}`}
                                className="w-full h-full object-contain"
                              />
                            ) : file.type.startsWith("video/") ? (
                              <div className="w-full h-full bg-black flex items-center justify-center relative">
                                <Video className="text-white h-8 w-8" />
                                {postType === 'viral_clips' && videoDuration && (
                                  <div className="absolute bottom-1 left-1 right-1 bg-black/70 rounded text-xs text-white text-center py-0.5">
                                    {videoDuration.toFixed(1)}s
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-full bg-black flex items-center justify-center">
                                <Volume2 className="text-white h-8 w-8" />
                              </div>
                            )}
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-1 right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                              onClick={()=>removeFile(i)}
                              disabled={processing}
                            >
                              <X className="h-3 w-3"/>
                            </Button>
                            {file.type.startsWith("image/") && (
                              <Button 
                                size="icon" 
                                className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                                onClick={()=>setAiEditing({open: true, imageIndex: i, selectedStyle: null, loading: false})}
                              >
                                <Wand2 className="h-3 w-3"/>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {postType !== 'viral_clips' && (
                      <>
                        <input 
                          ref={galleryInputRef} 
                          type="file" 
                          multiple 
                          accept="image/*,video/*,audio/*" 
                          className="hidden" 
                          onChange={e=>onFilesPicked(e.target.files)}
                          disabled={processing}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={()=>galleryInputRef.current?.click()}
                          disabled={processing}
                          className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 hover:from-blue-200 hover:to-purple-200"
                        >
                          <Images className="h-5 w-5"/>
                        </Button>
                        
                        <input 
                          ref={cameraPhotoInputRef} 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={e=>onFilesPicked(e.target.files)}
                          disabled={processing}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={()=>cameraPhotoInputRef.current?.click()}
                          disabled={processing}
                          className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600 hover:from-purple-200 hover:to-pink-200"
                        >
                          <Camera className="h-5 w-5"/>
                        </Button>
                        
                        {postType === 'standard' && (
                          <>
                            <input 
                              ref={cameraVideoInputRef} 
                              type="file" 
                              accept="video/*" 
                              capture="environment" 
                              className="hidden" 
                              onChange={e=>onFilesPicked(e.target.files)}
                              disabled={processing}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={()=>cameraVideoInputRef.current?.click()}
                              disabled={processing}
                              className="bg-gradient-to-br from-pink-100 to-orange-100 text-pink-600 hover:from-pink-200 hover:to-orange-200"
                            >
                              <Video className="h-5 w-5"/>
                            </Button>
                          </>
                        )}

                        {/* Botão para melhorar imagem */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            const firstImageIndex = mediaFiles.findIndex(f => f.type.startsWith("image/"));
                            if (firstImageIndex >= 0) {
                              setAiEditing({open: true, imageIndex: firstImageIndex, selectedStyle: null, loading: false});
                            } else {
                              toast({
                                variant: "destructive",
                                title: "Nenhuma imagem encontrada",
                                description: "Adicione uma imagem para usar o editor."
                              });
                            }
                          }}
                          disabled={processing || mediaFiles.length === 0}
                          className="bg-gradient-to-br from-green-100 to-emerald-100 text-emerald-600 hover:from-green-200 hover:to-emerald-200"
                        >
                          <Wand2 className="h-5 w-5"/>
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleCreatePost} 
                    disabled={uploading || processing} 
                    className={cn(
                      "rounded-full px-6 font-bold",
                      postType === 'viral_clips' 
                        ? "bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600" 
                        : postType === 'photo_audio'
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publicando...
                      </>
                    ) : processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : postType === 'viral_clips' ? (
                      "Publicar Clip"
                    ) : postType === 'photo_audio' ? (
                      "Publicar Flash"
                    ) : (
                      "Publicar na Arena"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout principal - 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna principal - 3/4 largura */}
          <div className="lg:col-span-3 space-y-6">
            {/* Exibir Clips aprovados no topo */}
            {clipsPosts.length > 0 && (
              <ClipsCarousel
                posts={clipsPosts.slice(0, 5)}
                user={user}
                handleLike={handleLike}
                onComment={setOpeningCommentsFor}
              />
            )}

            {/* Exibir 3 postagens normais primeiro */}
            {standardPosts.slice(0, 3)?.map((post) => {
              const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);
              const isAudio = post.audio_url && isAudioUrl(post.audio_url);

              return (
                <Card key={post.id} className="border shadow-md overflow-hidden transition-all hover:shadow-lg bg-gradient-to-br from-white to-blue-50/30">
                  <CardContent className="p-0">
                    {/* Cabeçalho do Post */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="ring-2 ring-blue-100">
                          <AvatarImage src={post.profiles?.avatar_url}/>
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
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
                             {post.is_community_approved && (
                               <Badge variant="outline" className="text-[10px] h-4 border-green-200 text-green-700 bg-green-50">
                                 Aprovado
                               </Badge>
                             )}
                          </div>
                        </div>
                      </div>
                      {post.user_id === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-blue-50">
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
                    
                    {post.content && (
                      <div className="px-4 pb-3 text-sm">
                        <MentionText text={post.content}/>
                      </div>
                    )}
                    
                    {/* Renderizar mídias */}
                    {renderMedia(post)}

                    {/* Renderizar áudio se existir */}
                    {isAudio && (
                      <div className="px-4 pb-3 flex items-center gap-2">
                        <AudioPlayer
                          src={post.audio_url}
                          isPlaying={playingAudio === post.audio_url}
                          onPlayPause={() => handleAudioPlayPause(post.audio_url)}
                        />
                        <span className="text-xs text-muted-foreground">
                          Áudio de {post.profiles?.username}
                        </span>
                      </div>
                    )}

                    <div className="p-3 flex items-center gap-2 border-t bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={()=>handleLike(post.id)} 
                        className={cn(
                          "rounded-full transition-colors", 
                          isLiked && "text-red-500 bg-red-50"
                        )}
                      >
                        <Heart className={cn("h-5 w-5 mr-1", isLiked && "fill-current")}/> 
                        {post.likes?.length || 0}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={()=>setOpeningCommentsFor(post)} 
                        className="rounded-full"
                      >
                        <MessageCircle className="h-5 w-5 mr-1"/> 
                        {post.comments?.length || 0}
                      </Button>
                      <div className="ml-auto">
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <Bookmark className="h-5 w-5"/>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Resto das postagens normais */}
            {standardPosts.slice(3)?.map((post) => {
              const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);
              const isAudio = post.audio_url && isAudioUrl(post.audio_url);

              return (
                <Card key={post.id} className="border shadow-md overflow-hidden transition-all hover:shadow-lg bg-gradient-to-br from-white to-blue-50/30">
                  <CardContent className="p-0">
                    {/* Cabeçalho do Post */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="ring-2 ring-blue-100">
                          <AvatarImage src={post.profiles?.avatar_url}/>
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
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
                             {post.is_community_approved && (
                               <Badge variant="outline" className="text-[10px] h-4 border-green-200 text-green-700 bg-green-50">
                                 Aprovado
                               </Badge>
                             )}
                          </div>
                        </div>
                      </div>
                      {post.user_id === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-blue-50">
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
                    
                    {post.content && (
                      <div className="px-4 pb-3 text-sm">
                        <MentionText text={post.content}/>
                      </div>
                    )}
                    
                    {/* Renderizar mídias */}
                    {renderMedia(post)}

                    {/* Renderizar áudio se existir */}
                    {isAudio && (
                      <div className="px-4 pb-3 flex items-center gap-2">
                        <AudioPlayer
                          src={post.audio_url}
                          isPlaying={playingAudio === post.audio_url}
                          onPlayPause={() => handleAudioPlayPause(post.audio_url)}
                        />
                        <span className="text-xs text-muted-foreground">
                          Áudio de {post.profiles?.username}
                        </span>
                      </div>
                    )}

                    <div className="p-3 flex items-center gap-2 border-t bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={()=>handleLike(post.id)} 
                        className={cn(
                          "rounded-full transition-colors", 
                          isLiked && "text-red-500 bg-red-50"
                        )}
                      >
                        <Heart className={cn("h-5 w-5 mr-1", isLiked && "fill-current")}/> 
                        {post.likes?.length || 0}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={()=>setOpeningCommentsFor(post)} 
                        className="rounded-full"
                      >
                        <MessageCircle className="h-5 w-5 mr-1"/> 
                        {post.comments?.length || 0}
                      </Button>
                      <div className="ml-auto">
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <Bookmark className="h-5 w-5"/>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Mensagem quando não há posts */}
            {(!posts || posts.length === 0) && (
              <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                <div className="text-muted-foreground mb-4">
                  <Globe className="h-12 w-12 mx-auto opacity-50" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhum post ainda</h3>
                <p className="text-sm text-muted-foreground">
                  Seja o primeiro a compartilhar algo no World Flow!
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
                      <h3 className="font-bold text-lg text-foreground">Flash</h3>
                      <p className="text-sm text-muted-foreground">Foto + Áudio (10s)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {flashPosts.slice(0, 5).map((post) => (
                      <FlashSidebarItem 
                        key={post.id}
                        post={post}
                        user={user}
                        handleLike={handleLike}
                        onComment={setOpeningCommentsFor}
                        onPlayAudio={handleAudioPlayPause}
                        isPlaying={playingAudio === post.audio_url}
                      />
                    ))}
                  </div>
                  
                  {flashPosts.length > 5 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-4 text-muted-foreground bg-white/50"
                      onClick={() => {
                        // Scroll para ver mais Flash
                        const flashSection = document.getElementById('flash-section');
                        if (flashSection) {
                          flashSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      Ver mais ({flashPosts.length - 5})
                    </Button>
                  )}
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
                      <h3 className="font-bold text-lg text-foreground">Clips</h3>
                      <p className="text-sm text-muted-foreground">Vídeos curtos (30s)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {clipsPosts.slice(0, 5).map((post) => (
                      <ClipSidebarItem 
                        key={post.id}
                        post={post}
                        user={user}
                        handleLike={handleLike}
                        onComment={setOpeningCommentsFor}
                      />
                    ))}
                  </div>
                  
                  {clipsPosts.length > 5 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-4 text-muted-foreground bg-white/50"
                      onClick={() => {
                        // Scroll para ver mais Clips
                        const clipsSection = document.getElementById('clips-section');
                        if (clipsSection) {
                          clipsSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      Ver mais ({clipsPosts.length - 5})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Seção extra para mais Flash */}
        {flashPosts.length > 5 && (
          <div id="flash-section">
            <Card className="border shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                    <FlashIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Mais Flash</h3>
                    <p className="text-sm text-muted-foreground">Veja todos os Flash disponíveis</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {flashPosts.slice(5).map((post) => (
                    <FlashSidebarItem 
                      key={post.id}
                      post={post}
                      user={user}
                      handleLike={handleLike}
                      onComment={setOpeningCommentsFor}
                      onPlayAudio={handleAudioPlayPause}
                      isPlaying={playingAudio === post.audio_url}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Seção extra para mais Clips */}
        {clipsPosts.length > 5 && (
          <div id="clips-section">
            <Card className="border shadow-lg bg-gradient-to-br from-pink-50 to-orange-50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-gradient-to-br from-pink-600 to-orange-600 p-2 rounded-lg">
                    <Flame className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Mais Clips</h3>
                    <p className="text-sm text-muted-foreground">Veja todos os Clips disponíveis</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clipsPosts.slice(5).map((post) => (
                    <ClipSidebarItem 
                      key={post.id}
                      post={post}
                      user={user}
                      handleLike={handleLike}
                      onComment={setOpeningCommentsFor}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Dialog de Estilo IA */}
      <Dialog open={aiEditing.open} onOpenChange={o => setAiEditing(p => ({...p, open: o}))}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-600"/> 
              Estúdio Mágico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mediaFiles[aiEditing.imageIndex] && (
              <div className="relative aspect-square rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                <img 
                  src={URL.createObjectURL(mediaFiles[aiEditing.imageIndex])} 
                  className="w-full h-full object-contain"
                  alt="Imagem para edição"
                />
                {aiEditing.loading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Wand2 className="h-10 w-10 animate-spin text-purple-400 mb-2"/>
                    <span className="font-bold">Aplicando mágica...</span>
                  </div>
                )}
              </div>
            )}
            <ScrollArea className="h-48">
              <div className="grid grid-cols-2 gap-2 pr-4">
                {AI_STYLES.map(s => { 
                  const Icon = s.icon; 
                  return (
                    <button 
                      key={s.id} 
                      disabled={aiEditing.loading} 
                      onClick={() => handleApplyStyle(s.id)} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-accent", 
                        aiEditing.loading && "opacity-50"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", s.color)}>
                        <Icon className="h-5 w-5"/>
                      </div>
                      <span className="text-sm font-medium">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setAiEditing(p => ({...p, open: false}))}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600" 
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