import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, X, Pencil, Trash2,
  Camera, Video, Minimize2, Images, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Sparkles, Wand2,
  Clock, Loader2, Flame, TrendingUp, Bomb, Users, Zap, Globe, Zap as FlashIcon,
  RefreshCw, RotateCw, Menu, Home, User, Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  MousePointer, Keyboard, ChevronUp, ChevronDown
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ---------- FUNÇÕES DE COMPRESSÃO DE ARQUIVOS ---------- */
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
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
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

const compressVideo = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (file.size < 10 * 1024 * 1024) {
      resolve(file);
      return;
    }
    
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    
    video.onloadedmetadata = () => {
      const compressedFile = new File(
        [file],
        file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
        { type: 'video/mp4', lastModified: Date.now() }
      );
      
      URL.revokeObjectURL(videoUrl);
      resolve(compressedFile);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video'));
    };
  });
};

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
    return file;
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

/* ---------- COMPONENTE: VideoPlayer TikTok ---------- */
interface TikTokVideoPlayerProps {
  src: string;
  post: any;
  user: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const TikTokVideoPlayer = ({ 
  src, 
  post, 
  user, 
  isActive,
  onLike,
  onComment,
  onShare,
  onNext,
  onPrevious
}: TikTokVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showNavigationButtons, setShowNavigationButtons] = useState(false);
  const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive && isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Se clicar no lado esquerdo (25% da tela), volta
    if (x < width * 0.25) {
      onPrevious();
    }
    // Se clicar no lado direito (25% da tela), avança
    else if (x > width * 0.75) {
      onNext();
    }
    // Se clicar no meio, play/pause
    else {
      togglePlay();
      setShowControls(true);
      setTimeout(() => setShowControls(false), 3000);
    }
  };

  const handleMouseEnter = () => {
    setShowNavigationButtons(true);
  };

  const handleMouseLeave = () => {
    setShowNavigationButtons(false);
  };

  return (
    <div 
      className="relative w-full h-full bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover cursor-pointer"
        loop
        muted={isMuted}
        playsInline
        onClick={handleVideoClick}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-orange-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Botões de navegação PC */}
      {showNavigationButtons && (
        <>
          <button
            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-16 w-8 bg-black/50 text-white rounded-r-lg flex items-center justify-center hover:bg-black/70 transition-colors"
            onClick={onPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 h-16 w-8 bg-black/50 text-white rounded-l-lg flex items-center justify-center hover:bg-black/70 transition-colors"
            onClick={onNext}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      
      {/* Controles */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Button
            size="icon"
            className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>
        </div>
      )}
      
      {/* Sidebar de ações */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-black/40 text-white hover:bg-black/60 mb-1"
                  onClick={onLike}
                >
                  <Heart className={cn("h-7 w-7", isLiked && "fill-current text-red-500")} />
                </Button>
                <span className="text-white text-xs font-medium">{post.likes?.length || 0}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Curtir (L)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-black/40 text-white hover:bg-black/60 mb-1"
                  onClick={onComment}
                >
                  <MessageCircle className="h-7 w-7" />
                </Button>
                <span className="text-white text-xs font-medium">{post.comments?.length || 0}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Comentar (C)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-black/40 text-white hover:bg-black/60 mb-1"
                  onClick={onShare}
                >
                  <Send className="h-7 w-7" />
                </Button>
                <span className="text-white text-xs font-medium">Compartilhar</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Compartilhar (S)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full bg-black/40 text-white hover:bg-black/60"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-7 w-7" />
                ) : (
                  <Volume2 className="h-7 w-7" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMuted ? "Ativar som (M)" : "Desativar som (M)"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full bg-black/40 text-white hover:bg-black/60"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPlaying ? "Pausar (Espaço)" : "Play (Espaço)"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Informações do post */}
      <div className="absolute bottom-24 left-4 right-20 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/50">
            <AvatarImage src={post.profiles?.avatar_url}/>
            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600">
              {post.profiles?.username?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <UserLink 
              userId={post.user_id} 
              username={post.profiles?.username || ''}
              className="font-bold text-white text-base hover:text-white/80"
            >
              @{post.profiles?.username}
            </UserLink>
          </div>
        </div>
        <p className="text-white/90 text-sm mb-2">{post.content}</p>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white border-0">#{post.post_type}</Badge>
          <span className="text-white/70 text-xs">
            {new Date(post.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Instruções de navegação PC */}
      <div className="absolute top-4 left-4 bg-black/70 text-white/80 text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Keyboard className="h-3 w-3" />
          <span>Use as setas ou clique nas bordas</span>
        </div>
      </div>
    </div>
  );
};

/* ---------- COMPONENTE: TikTok Post Card ---------- */
interface TikTokPostCardProps {
  post: any;
  user: any;
  isActive: boolean;
  onLike: (postId: string) => void;
  onComment: (post: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const TikTokPostCard = ({ 
  post, 
  user, 
  isActive,
  onLike,
  onComment,
  onNext,
  onPrevious
}: TikTokPostCardProps) => {
  const [showFullText, setShowFullText] = useState(false);
  const [showNavigationButtons, setShowNavigationButtons] = useState(false);
  
  const getMediaUrl = (post: any) => {
    if (!post.media_urls || !Array.isArray(post.media_urls) || post.media_urls.length === 0) {
      return null;
    }
    
    const url = post.media_urls[0];
    if (!url || typeof url !== 'string') return null;
    
    return url.replace(/^(image::|video::|audio::)/, '');
  };

  const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = /\.(mp4|webm|ogg|mov|m4v|avi|mkv|flv|wmv)$/i;
    return videoExtensions.test(url) || url.startsWith('video::');
  };

  const mediaUrl = getMediaUrl(post);
  const isPostVideo = mediaUrl && isVideo(mediaUrl);
  const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post de @${post.profiles?.username}`,
          text: post.content,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width * 0.25) {
      onPrevious();
    } else if (x > width * 0.75) {
      onNext();
    }
  };

  if (isPostVideo) {
    return (
      <TikTokVideoPlayer
        src={mediaUrl}
        post={post}
        user={user}
        isActive={isActive}
        onLike={() => onLike(post.id)}
        onComment={() => onComment(post)}
        onShare={handleShare}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    );
  }

  // Post com imagem/texto
  return (
    <div 
      className="relative w-full h-full bg-gradient-to-b from-gray-900 to-black overflow-y-auto"
      onMouseEnter={() => setShowNavigationButtons(true)}
      onMouseLeave={() => setShowNavigationButtons(false)}
    >
      {/* Botões de navegação PC */}
      {showNavigationButtons && (
        <>
          <button
            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-16 w-8 bg-black/50 text-white rounded-r-lg flex items-center justify-center hover:bg-black/70 transition-colors z-10"
            onClick={onPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 h-16 w-8 bg-black/50 text-white rounded-l-lg flex items-center justify-center hover:bg-black/70 transition-colors z-10"
            onClick={onNext}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Conteúdo do post */}
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={post.profiles?.avatar_url}/>
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              {post.profiles?.username?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <UserLink 
              userId={post.user_id} 
              username={post.profiles?.username || ''}
              className="font-bold text-white text-lg hover:text-white/80"
            >
              @{post.profiles?.username}
            </UserLink>
            <p className="text-white/70 text-sm">
              {new Date(post.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Texto */}
        {post.content && (
          <div className="mb-4">
            <p className={cn("text-white text-base", !showFullText && "line-clamp-3")}>
              {post.content}
            </p>
            {post.content.length > 150 && (
              <Button
                variant="link"
                className="text-blue-400 p-0 h-auto"
                onClick={() => setShowFullText(!showFullText)}
              >
                {showFullText ? "Ver menos" : "Ver mais"}
              </Button>
            )}
          </div>
        )}

        {/* Mídia */}
        {mediaUrl && !isVideo(mediaUrl) && (
          <div 
            className="mb-4 rounded-xl overflow-hidden cursor-pointer relative"
            onClick={handleImageClick}
          >
            <ProgressiveImage
              src={mediaUrl}
              alt={`Mídia de ${post.profiles?.username}`}
              className="w-full max-h-96"
              objectFit="cover"
            />
            <div className="absolute top-4 left-4 bg-black/70 text-white/80 text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <MousePointer className="h-3 w-3" />
                <span>Clique nas bordas para navegar</span>
              </div>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            className={cn("text-white", isLiked && "text-red-500")}
            onClick={() => onLike(post.id)}
          >
            <Heart className={cn("h-6 w-6 mr-2", isLiked && "fill-current")} />
            <span>{post.likes?.length || 0}</span>
          </Button>
          
          <Button
            variant="ghost"
            className="text-white"
            onClick={() => onComment(post)}
          >
            <MessageCircle className="h-6 w-6 mr-2" />
            <span>{post.comments?.length || 0}</span>
          </Button>
          
          <Button
            variant="ghost"
            className="text-white"
            onClick={handleShare}
          >
            <Send className="h-6 w-6 mr-2" />
          </Button>
          
          <Button variant="ghost" className="text-white ml-auto">
            <Bookmark className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ---------- COMPONENTE: Criação de Post ---------- */
const CreatePostScreen = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [postType, setPostType] = useState<'standard' | 'viral_clips'>('standard');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);

  const onFilesPicked = async (files?: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setProcessing(true);
    const accepted: File[] = [];
    
    for (const f of list) {
      try {
        if (f.type.startsWith("image/")) {
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
          } else if (postType === 'standard') {
            if (dur <= 15.3) {
              const compressedFile = await processMediaFile(f);
              accepted.push(compressedFile);
            } else {
              toast({ variant: "destructive", title: "Vídeo longo (Max 15s)" });
            }
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

  const handleCreatePost = async () => {
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
        
        if (file.type.startsWith("video/")) {
          mediaUrls.push(`video::${urlData.publicUrl}`);
        } else if (file.type.startsWith("image/")) {
          mediaUrls.push(`image::${urlData.publicUrl}`);
        }
      }
      
      const ends = new Date(); 
      ends.setMinutes(ends.getMinutes() + 60);

      const content = newPost;
      const { data: post, error } = await supabase
        .from("posts")
        .insert({ 
          user_id: user?.id, 
          content, 
          media_urls: mediaUrls.length ? mediaUrls : null, 
          audio_url: null,
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
      
      toast({ 
        title: postType === 'viral_clips' ? "Clip publicado! 🔥" : "Post publicado! 🎉",
        description: "Seu conteúdo foi publicado com sucesso!"
      });
      
      setNewPost(""); 
      setMediaFiles([]); 
      setVideoDuration(null);
      
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });
      onClose();
      
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

  // Teclado shortcuts para tela de criação
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCreatePost();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreatePost, onClose]);

  return (
    <div className="h-full bg-gradient-to-b from-gray-900 to-black text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white"
              title="Voltar (ESC)"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Criar Post</h1>
              <p className="text-xs text-gray-400">Ctrl+Enter para publicar • ESC para voltar</p>
            </div>
          </div>
          <Button
            onClick={handleCreatePost}
            disabled={uploading || processing}
            className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
            title="Ctrl+Enter"
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
            ) : (
              "Publicar"
            )}
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6 space-y-6">
        {/* Tipo de post */}
        <div className="flex gap-2">
          <Button 
            variant={postType==='standard'?"default":"outline"} 
            onClick={()=>{
              setPostType('standard');
              setMediaFiles([]);
              setVideoDuration(null);
            }} 
            className={cn(
              "flex-1",
              postType==='standard' 
                ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white border-0" 
                : "text-white border-white/20"
            )}
          >
            <Globe className="h-4 w-4 mr-2" />
            Post
          </Button>
          <Button 
            variant={postType==='viral_clips'?"default":"outline"} 
            onClick={()=>{
              setPostType('viral_clips');
              setMediaFiles([]);
              setVideoDuration(null);
            }} 
            className={cn(
              "flex-1",
              postType==='viral_clips' 
                ? "bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 text-white border-0" 
                : "text-white border-white/20"
            )}
          >
            <Flame className="h-4 w-4 mr-2" />
            Clip
          </Button>
        </div>

        {/* Área de texto */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url}/>
              <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">@{user?.user_metadata?.username || user?.email?.split('@')[0]}</p>
            </div>
          </div>
          
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={
              postType === 'standard' 
                ? "No que está pensando? @menção #tag" 
                : "Adicione uma descrição para o seu Clip..."
            }
            className="w-full bg-transparent border border-white/20 rounded-xl p-4 text-white placeholder-white/50 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
            autoFocus
          />
        </div>

        {/* Preview de mídias */}
        {mediaFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Mídias selecionadas:</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMediaFiles([]);
                  setVideoDuration(null);
                }}
                className="text-white/70 hover:text-white"
              >
                Limpar tudo
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mediaFiles.map((file, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden group">
                  {file.type.startsWith("image/") ? (
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Preview ${i}`}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-black flex items-center justify-center relative">
                      <Video className="text-white h-8 w-8" />
                      {videoDuration && (
                        <div className="absolute bottom-2 left-2 bg-black/70 rounded text-xs text-white px-2 py-1">
                          {videoDuration.toFixed(1)}s
                        </div>
                      )}
                    </div>
                  )}
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={()=>removeFile(i)}
                  >
                    <X className="h-3 w-3"/>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opções de mídia */}
        <div className="space-y-4">
          <h3 className="font-semibold">Adicionar mídia</h3>
          <div className="grid grid-cols-3 gap-3">
            <input 
              ref={galleryInputRef} 
              type="file" 
              multiple 
              accept="image/*,video/*" 
              className="hidden" 
              onChange={e=>onFilesPicked(e.target.files)}
              disabled={processing}
            />
            <Button 
              variant="outline"
              onClick={()=>galleryInputRef.current?.click()}
              disabled={processing}
              className="flex flex-col items-center justify-center h-24 border-dashed border-white/30 text-white hover:bg-white/10"
              title="G - Galeria"
            >
              <Images className="h-8 w-8 mb-2" />
              <span className="text-sm">Galeria</span>
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
              variant="outline"
              onClick={()=>cameraPhotoInputRef.current?.click()}
              disabled={processing}
              className="flex flex-col items-center justify-center h-24 border-dashed border-white/30 text-white hover:bg-white/10"
              title="C - Câmera"
            >
              <Camera className="h-8 w-8 mb-2" />
              <span className="text-sm">Câmera</span>
            </Button>
            
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
              variant="outline"
              onClick={()=>cameraVideoInputRef.current?.click()}
              disabled={processing}
              className="flex flex-col items-center justify-center h-24 border-dashed border-white/30 text-white hover:bg-white/10"
              title="V - Vídeo"
            >
              <Video className="h-8 w-8 mb-2" />
              <span className="text-sm">Vídeo</span>
            </Button>
          </div>
        </div>

        {/* Teclas de atalho */}
        <div className="bg-black/50 rounded-lg p-4 border border-white/10">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Atalhos do teclado
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="bg-gray-800 px-2 py-1 rounded text-xs">ESC</kbd>
              <span className="text-gray-300">Voltar</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="bg-gray-800 px-2 py-1 rounded text-xs">Ctrl</kbd>
              <span className="text-gray-300">+</span>
              <kbd className="bg-gray-800 px-2 py-1 rounded text-xs">Enter</kbd>
              <span className="text-gray-300">Publicar</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="bg-gray-800 px-2 py-1 rounded text-xs">G</kbd>
              <span className="text-gray-300">Galeria</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="bg-gray-800 px-2 py-1 rounded text-xs">C</kbd>
              <span className="text-gray-300">Câmera</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- HELPERS ---------- */
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

const getMediaDurationSafe = async (file: File, timeoutMs = 4000): Promise<number> => {
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
};

/* ---------- COMPONENTE PRINCIPAL TIKTOK ---------- */
export default function WorldFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /* Estados principais */
  const [activeTab, setActiveTab] = useState<'clips' | 'feed' | 'create'>('clips');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Estados para comentários - MOVIDO PARA CIMA para evitar o erro
  const [openingCommentsFor, setOpeningCommentsFor] = useState<any>(null);
  const [newCommentText, setNewCommentText] = useState("");

  /* Detectar dispositivo touch */
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  /* Query dos posts */
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
        
        if (error) throw error;
        
        return (data || []).map(post => ({
          ...post,
          media_urls: Array.isArray(post.media_urls) 
            ? post.media_urls.filter(url => url && typeof url === 'string').map(url => url.trim())
            : []
        }));
      } catch (error) {
        console.error("Erro na query de posts:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  /* Filtragem de posts */
  const clipsPosts = posts?.filter(x => x.post_type === 'viral_clips') || [];
  const standardPosts = posts?.filter(x => x.post_type === 'standard') || [];
  const allPosts = [...clipsPosts, ...standardPosts];

  /* Mutation para adicionar comentário - MOVIDO PARA DEPOIS dos estados */
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

  /* Query para buscar comentários - MOVIDO PARA DEPOIS dos estados */
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

  /* Handlers de navegação */
  const handleNext = () => {
    if (currentIndex < allPosts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNextTab = () => {
    const tabs: ('clips' | 'feed' | 'create')[] = ['clips', 'feed', 'create'];
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex]);
  };

  const handlePreviousTab = () => {
    const tabs: ('clips' | 'feed' | 'create')[] = ['clips', 'feed', 'create'];
    const currentIndex = tabs.indexOf(activeTab);
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    setActiveTab(tabs[prevIndex]);
  };

  /* Eventos de teclado */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navegação geral
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (activeTab === 'clips') {
            handleNextTab();
          } else if (activeTab === 'feed') {
            // No feed, direita também muda de tab
            handleNextTab();
          }
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          if (activeTab === 'clips') {
            handlePreviousTab();
          } else if (activeTab === 'create') {
            // Na criação, esquerda volta para clips
            setActiveTab('clips');
          }
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          if (activeTab === 'clips') {
            handleNext();
          } else if (activeTab === 'feed') {
            // No feed, baixo scrolla
            window.scrollBy({ top: 100, behavior: 'smooth' });
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          if (activeTab === 'clips') {
            handlePrevious();
          } else if (activeTab === 'feed') {
            // No feed, cima scrolla
            window.scrollBy({ top: -100, behavior: 'smooth' });
          }
          break;
          
        case ' ':
          e.preventDefault();
          // Space para play/pause no player de vídeo
          const videoElement = document.querySelector('video');
          if (videoElement) {
            if (videoElement.paused) {
              videoElement.play();
            } else {
              videoElement.pause();
            }
          }
          break;
          
        case 'm':
        case 'M':
          e.preventDefault();
          // M para mute/unmute
          const video = document.querySelector('video');
          if (video) {
            video.muted = !video.muted;
          }
          break;
          
        case 'l':
        case 'L':
          e.preventDefault();
          // L para curtir post atual
          if (allPosts[currentIndex]) {
            handleLike(allPosts[currentIndex].id);
          }
          break;
          
        case 'c':
        case 'C':
          e.preventDefault();
          // C para comentar no post atual
          if (allPosts[currentIndex]) {
            setOpeningCommentsFor(allPosts[currentIndex]);
          }
          break;
          
        case 's':
        case 'S':
          e.preventDefault();
          // S para compartilhar
          toast({
            title: "Compartilhar",
            description: "Link copiado para a área de transferência!",
          });
          break;
          
        case 'Escape':
          if (openingCommentsFor) {
            setOpeningCommentsFor(null);
          } else if (showKeyboardHelp) {
            setShowKeyboardHelp(false);
          } else if (activeTab === 'create') {
            setActiveTab('clips');
          }
          break;
          
        case 'h':
        case 'H':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowKeyboardHelp(!showKeyboardHelp);
          }
          break;
          
        case '1':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActiveTab('clips');
          }
          break;
          
        case '2':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActiveTab('feed');
          }
          break;
          
        case '3':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActiveTab('create');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, currentIndex, allPosts, openingCommentsFor, showKeyboardHelp]);

  /* Evento de scroll do mouse */
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (activeTab === 'clips') {
        e.preventDefault();
        if (e.deltaY > 0) {
          handleNext();
        } else {
          handlePrevious();
        }
      }
    };

    const container = document.querySelector('.main-container');
    if (container && activeTab === 'clips') {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [activeTab, currentIndex, allPosts.length]);

  /* Handlers de gestos touch */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    const xDiff = touchStart.x - touchEnd.x;
    const yDiff = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    // Swipe horizontal (esquerda/direita)
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (Math.abs(xDiff) > minSwipeDistance) {
        if (xDiff > 0) {
          // Swipe para esquerda
          setActiveTab('create');
        } else {
          // Swipe para direita
          setActiveTab('clips');
        }
      }
    } else {
      // Swipe vertical (cima/baixo)
      if (Math.abs(yDiff) > minSwipeDistance) {
        if (yDiff > 0) {
          // Swipe para baixo - próxima postagem
          handleNext();
        } else {
          // Swipe para cima - postagem anterior
          handlePrevious();
        }
      }
    }
  };

  /* Handlers de ações */
  const handleLike = async (postId: string) => {
    try {
      const post = allPosts.find(p => p.id === postId);
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

  /* Renderização baseada na tab atual */
  const renderContent = () => {
    switch (activeTab) {
      case 'clips':
        if (allPosts.length === 0) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-white p-8">
              <Flame className="h-16 w-16 mb-4 text-gray-500" />
              <h2 className="text-xl font-bold mb-2">Nenhum post ainda</h2>
              <p className="text-gray-400 text-center mb-6">
                Seja o primeiro a compartilhar algo!
              </p>
              <Button
                onClick={() => setActiveTab('create')}
                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
              >
                Criar primeiro post
              </Button>
            </div>
          );
        }

        const currentPost = allPosts[currentIndex];
        return (
          <TikTokPostCard
            key={currentPost.id}
            post={currentPost}
            user={user}
            isActive={true}
            onLike={handleLike}
            onComment={setOpeningCommentsFor}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );

      case 'feed':
        return (
          <div className="h-full overflow-y-auto bg-gradient-to-b from-gray-900 to-black main-container">
            <div className="p-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Feed</h2>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">
                    Use ↑↓ para scroll
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('create')}
                    className="text-white border-white/20"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Novo Post
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {standardPosts.map((post) => (
                  <Card key={post.id} className="bg-gray-800 border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar>
                            <AvatarImage src={post.profiles?.avatar_url}/>
                            <AvatarFallback>
                              {post.profiles?.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <UserLink 
                              userId={post.user_id} 
                              username={post.profiles?.username||""} 
                              className="font-bold text-white hover:underline"
                            >
                              @{post.profiles?.username}
                            </UserLink>
                            <p className="text-gray-400 text-sm">
                              {new Date(post.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        {post.content && (
                          <p className="text-white mb-3">{post.content}</p>
                        )}
                      </div>
                      
                      {/* Mídia */}
                      {post.media_urls?.[0] && (
                        <div className="relative">
                          <ProgressiveImage
                            src={stripPrefix(post.media_urls[0])}
                            alt={`Mídia de ${post.profiles?.username}`}
                            className="w-full max-h-96"
                            objectFit="cover"
                          />
                        </div>
                      )}
                      
                      {/* Ações */}
                      <div className="p-4 flex items-center gap-4 border-t border-gray-700">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-white",
                            post.likes?.some((l:any) => l.user_id === user?.id) && "text-red-500"
                          )}
                          onClick={() => handleLike(post.id)}
                        >
                          <Heart className={cn(
                            "h-5 w-5 mr-2",
                            post.likes?.some((l:any) => l.user_id === user?.id) && "fill-current"
                          )} />
                          {post.likes?.length || 0}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white"
                          onClick={() => setOpeningCommentsFor(post)}
                        >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          {post.comments?.length || 0}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 'create':
        return <CreatePostScreen onClose={() => setActiveTab('clips')} />;

      default:
        return null;
    }
  };

  /* Navegação inferior */
  const BottomNavigation = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-40">
      <div className="flex items-center justify-around p-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full transition-all",
                  activeTab === 'clips' 
                    ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white scale-110" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
                onClick={() => setActiveTab('clips')}
              >
                <Home className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clips (Ctrl+1)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full transition-all",
                  activeTab === 'feed' 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
                onClick={() => setActiveTab('feed')}
              >
                <Globe className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Feed (Ctrl+2)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full transition-all",
                  activeTab === 'create' 
                    ? "bg-gradient-to-r from-green-500 to-teal-500 text-white scale-110" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
                onClick={() => setActiveTab('create')}
              >
                <Pencil className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Criar (Ctrl+3)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Menu superior */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={showMenu} onOpenChange={setShowMenu}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  title="Menu (M)"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-gray-900 border-r border-gray-800">
                <SheetHeader>
                  <SheetTitle className="text-white">Menu</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <div className="flex items-center gap-3 p-3">
                    <Avatar>
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>
                        {user?.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-white">@{user?.user_metadata?.username || user?.email?.split('@')[0]}</p>
                      <p className="text-gray-400 text-sm">{user?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1 mt-4">
                    <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-800">
                      <Home className="mr-3 h-4 w-4" />
                      Início
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-800">
                      <User className="mr-3 h-4 w-4" />
                      Perfil
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-800">
                      <Settings className="mr-3 h-4 w-4" />
                      Configurações
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-gray-800"
                      onClick={() => setShowKeyboardHelp(true)}
                    >
                      <Keyboard className="mr-3 h-4 w-4" />
                      Atalhos de Teclado
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="text-white">
              <h1 className="font-bold text-lg">WORLD Flow</h1>
              <p className="text-xs text-gray-400">
                {activeTab === 'clips' ? 'Clips' : 
                 activeTab === 'feed' ? 'Feed' : 
                 'Criar Post'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'clips' && allPosts.length > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                <span className="text-white text-sm">
                  {currentIndex + 1} / {allPosts.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white hover:bg-white/20"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white hover:bg-white/20"
                    onClick={handleNext}
                    disabled={currentIndex === allPosts.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Badge className={cn(
              "hidden md:flex",
              activeTab === 'clips' ? "bg-gradient-to-r from-pink-500 to-orange-500" :
              activeTab === 'feed' ? "bg-gradient-to-r from-blue-500 to-purple-500" :
              "bg-gradient-to-r from-green-500 to-teal-500"
            )}>
              {isTouchDevice ? "Toque para navegar" : "Use as setas do teclado"}
            </Badge>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowKeyboardHelp(true)}
              title="Atalhos de teclado (Ctrl+H)"
            >
              <Keyboard className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Área principal com gestos e navegação */}
      <div 
        className="h-full w-full main-container"
        onTouchStart={isTouchDevice ? handleTouchStart : undefined}
        onTouchMove={isTouchDevice ? handleTouchMove : undefined}
        onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
      >
        {renderContent()}
      </div>

      {/* Indicadores de navegação PC */}
      {!isTouchDevice && activeTab === 'clips' && allPosts.length > 0 && (
        <>
          <div className="fixed top-1/2 left-4 transform -translate-y-1/2 z-30">
            <div className="flex flex-col items-center gap-2">
              <div className="text-white/50 text-xs rotate-90 hidden md:block">SETAS</div>
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                <div className="flex flex-col items-center">
                  <ArrowUp className="h-4 w-4 text-white/70" />
                  <span className="text-white/50 text-xs">↑</span>
                  <ArrowDown className="h-4 w-4 text-white/70 mt-2" />
                  <span className="text-white/50 text-xs">↓</span>
                </div>
              </div>
            </div>
          </div>
          <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-30">
            <div className="flex flex-col items-center gap-2">
              <div className="text-white/50 text-xs rotate-90 hidden md:block">ABAS</div>
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                <div className="flex flex-col items-center">
                  <ArrowLeft className="h-4 w-4 text-white/70" />
                  <span className="text-white/50 text-xs">←</span>
                  <ArrowRight className="h-4 w-4 text-white/70 mt-2" />
                  <span className="text-white/50 text-xs">→</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navegação inferior */}
      <BottomNavigation />

      {/* Dialog de ajuda do teclado */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Atalhos de Teclado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-pink-400">Navegação</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Setas ↑↓</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Posts Anterior/Próximo</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Setas ←→</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Trocar Abas</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Ctrl+1/2/3</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Ir para Clips/Feed/Criar</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">ESC</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Voltar/Fechar</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-blue-400">Ações</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Espaço</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Play/Pause Vídeo</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">M</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Mutar/Desmutar</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">L</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Curtir Post</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">C</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Comentar</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">S</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Compartilhar</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Ctrl+H</span>
                    <kbd className="bg-gray-800 px-2 py-1 rounded text-sm">Esta ajuda</kbd>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-green-400">Navegação com Mouse</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <MousePointer className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">Clique nas bordas esquerda/direita para navegar entre posts</span>
                </div>
                <div className="flex items-center gap-3">
                  <MousePointer className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">Scroll do mouse para navegar entre posts (aba Clips)</span>
                </div>
                <div className="flex items-center gap-3">
                  <MousePointer className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">Clique no meio do vídeo para play/pause</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowKeyboardHelp(false)}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de comentários */}
      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => !o && setOpeningCommentsFor(null)}>
        <DialogContent className="max-w-lg bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            {loadingComments ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-400 mt-2">Carregando comentários...</p>
              </div>
            ) : comments?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Nenhum comentário ainda. Seja o primeiro!</p>
              </div>
            ) : (
              comments?.map((c:any) => (
                <div key={c.id} className="flex gap-3 mb-4 p-3 rounded-lg bg-gray-800/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.author?.avatar_url}/>
                    <AvatarFallback>{c.author?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{c.author?.username}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-white text-sm mt-1">{c.content}</p>
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
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addComment.mutate();
                }
                if (e.key === 'Escape') {
                  setOpeningCommentsFor(null);
                }
              }}
            />
            <Button 
              size="icon" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600" 
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
    </div>
  );
}