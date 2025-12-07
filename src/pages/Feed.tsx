import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// CORREÇÃO AQUI: Mudado de "lucide" para "lucide-react"
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, X, Pencil, Trash2,
  Camera, Video, Minimize2, Images, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Sparkles, Wand2,
  Clock, Loader2, Flame, TrendingUp, Bomb, Users, Zap, Globe, Zap as FlashIcon,
  RefreshCw, RotateCw, Menu, Home, User, Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  MousePointer, Keyboard, ChevronUp, ChevronDown, MoveVertical
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
      if (isActive) {
        if (isPlaying) {
          videoRef.current.play().catch(console.error);
        } else {
          videoRef.current.pause();
        }
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
        if(isActive) {
            videoRef.current.play().catch(console.error);
        }
      }
      setIsPlaying(prev => !prev);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
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
    
    if (x < width * 0.25) {
        // Área esquerda reservada
    } else if (x > width * 0.75) {
        // Área direita reservada
    } else {
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
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-orange-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {showNavigationButtons && (
        <>
          <button
            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-16 w-8 bg-black/50 text-white rounded-r-lg flex items-center justify-center hover:bg-black/70 transition-colors"
            onClick={onPrevious}
          >
            <ChevronUp className="h-6 w-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 h-16 w-8 bg-black/50 text-white rounded-l-lg flex items-center justify-center hover:bg-black/70 transition-colors"
            onClick={onNext}
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </>
      )}
      
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

      <div className="absolute top-4 left-4 bg-black/70 text-white/80 text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Keyboard className="h-3 w-3" />
          <span>Use as setas ou clique nas bordas</span>
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

/* ---------- COMPONENTE PRINCIPAL TIKTOK ---------- */
export default function WorldFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /* Estados principais */
  const [activeTab, setActiveTab] = useState<'clips' | 'feed' | 'create'>('clips');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openingCommentsFor, setOpeningCommentsFor] = useState<any>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  /* Estados para gestos */
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [wheelDelta, setWheelDelta] = useState(0);

  /* Detectar dispositivo touch */
  useEffect(() => {
    const checkTouchDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouch);
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  /* Reset currentIndex ao trocar de aba */
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeTab]);

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
  
  const verticalClipPosts = clipsPosts;
  const verticalFeedPosts = standardPosts;

  /* Mutation para adicionar comentário */
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

  /* Query para buscar comentários */
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
  const handleNext = useCallback(() => {
    const list = activeTab === 'clips' ? verticalClipPosts : verticalFeedPosts;
    if (currentIndex < list.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [activeTab, currentIndex, verticalClipPosts, verticalFeedPosts]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  /* CORREÇÃO: Lógica de swipe corrigida conforme solicitado */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
      setSwipeDirection(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchEnd({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleTouchEnd = () => {
    if (touchStart.x === 0 && touchStart.y === 0) return;
    
    const xDiff = touchStart.x - touchEnd.x;
    const yDiff = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;
    
    /* CORREÇÃO: Lógica invertida conforme solicitado */
    if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > minSwipeDistance) {
      if (xDiff > 0) {
        // Swipe ESQUERDA → Vai para Criar (da aba Feed para Criar)
        if (activeTab === 'feed') {
          setSwipeDirection('left');
          setTimeout(() => { setActiveTab('create'); setSwipeDirection(null); }, 300);
        } else if (activeTab === 'clips') {
          setSwipeDirection('left');
          setTimeout(() => { setActiveTab('feed'); setSwipeDirection(null); }, 300);
        }
      } else {
        // Swipe DIREITA → Vai para Clips (da aba Feed para Clips)
        if (activeTab === 'feed') {
          setSwipeDirection('right');
          setTimeout(() => { setActiveTab('clips'); setSwipeDirection(null); }, 300);
        } else if (activeTab === 'create') {
          setSwipeDirection('right');
          setTimeout(() => { setActiveTab('feed'); setSwipeDirection(null); }, 300);
        }
      }
    } else if (Math.abs(yDiff) > Math.abs(xDiff) && Math.abs(yDiff) > minSwipeDistance) {
      if (yDiff > 0) {
        // Swipe PARA CIMA → Anterior Post
        setSwipeDirection('up');
        setTimeout(() => {
          handlePrevious();
          setSwipeDirection(null);
        }, 300);
      } else {
        // Swipe PARA BAIXO → Próximo Post
        setSwipeDirection('down');
        setTimeout(() => {
          handleNext();
          setSwipeDirection(null);
        }, 300);
      }
    }

    setTouchStart({ x: 0, y: 0 });
    setTouchEnd({ x: 0, y: 0 });
  };

  /* Eventos de wheel (scroll) para PC */
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || isTouchDevice) {
        return;
      }

      if (activeTab === 'clips' || activeTab === 'feed') {
        e.preventDefault();
        
        setWheelDelta(prev => {
          const newDelta = prev + e.deltaY;
          
          if (Math.abs(newDelta) > 100) {
            if (e.deltaY > 0) {
              handleNext();
            } else {
              handlePrevious();
            }
            return 0;
          }
          
          return newDelta;
        });
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeTab, isTouchDevice, handleNext, handlePrevious]);

  /* CORREÇÃO: Eventos de teclado corrigidos conforme solicitado */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement instanceof HTMLInputElement || 
                             document.activeElement instanceof HTMLTextAreaElement;
      
      if (isInputFocused && e.key !== 'Escape') {
        return;
      }
      
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          // Seta direita → Vai para Clips (da aba Feed para Clips)
          if (activeTab === 'feed') setActiveTab('clips');
          else if (activeTab === 'create') setActiveTab('feed');
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          // Seta esquerda → Vai para Criar (da aba Feed para Criar)
          if (activeTab === 'feed') setActiveTab('create');
          else if (activeTab === 'clips') setActiveTab('feed');
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          // Seta baixo → Próximo Post
          handleNext();
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          // Seta cima → Anterior Post
          handlePrevious();
          break;
          
        case ' ': 
          if (activeTab === 'clips') {
            e.preventDefault();
            const videoElement = document.querySelector('video');
            if (videoElement) {
              if (videoElement.paused) {
                videoElement.play();
              } else {
                videoElement.pause();
              }
            }
          }
          break;
          
        case 'Escape': 
          if (openingCommentsFor) {
            setOpeningCommentsFor(null);
          } else if (showKeyboardHelp) {
            setShowKeyboardHelp(false);
          } else if (activeTab === 'create') {
            setActiveTab('feed');
          } else if (activeTab === 'feed') {
            setActiveTab('clips');
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
          
        case 'l':
        case 'L':
          if (activeTab === 'clips' || activeTab === 'feed') {
            e.preventDefault();
            const list = activeTab === 'clips' ? verticalClipPosts : verticalFeedPosts;
            const currentPost = list[currentIndex];
            if (currentPost) {
              handleLike(currentPost.id);
            }
          }
          break;
          
        case 'c':
        case 'C':
          if (activeTab === 'clips' || activeTab === 'feed') {
            e.preventDefault();
            const list = activeTab === 'clips' ? verticalClipPosts : verticalFeedPosts;
            const currentPost = list[currentIndex];
            if (currentPost) {
              setOpeningCommentsFor(currentPost);
            }
          }
          break;
          
        case 'm':
        case 'M':
          if (activeTab === 'clips') {
            e.preventDefault();
            const videoElement = document.querySelector('video');
            if (videoElement) {
              videoElement.muted = !videoElement.muted;
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, currentIndex, verticalClipPosts, verticalFeedPosts, openingCommentsFor, showKeyboardHelp, handleNext, handlePrevious]);

  /* Handlers de ações */
  const handleLike = async (postId: string) => {
    try {
      const post = [...verticalClipPosts, ...verticalFeedPosts].find(p => p.id === postId);
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

  /* Componente para Clips */
  const TikTokClipsView = () => {
    if (verticalClipPosts.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-white p-8">
          <Flame className="h-16 w-16 mb-4 text-gray-500" />
          <h2 className="text-xl font-bold mb-2">Nenhum clip ainda</h2>
          <p className="text-gray-400 text-center mb-6">
            Seja o primeiro a compartilhar um clip!
          </p>
          <Button
            onClick={() => setActiveTab('create')}
            className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
          >
            Criar primeiro clip
          </Button>
        </div>
      );
    }

    const safeIndex = currentIndex % verticalClipPosts.length;
    const currentPost = verticalClipPosts[safeIndex];
    
    if (!currentPost) {
        setCurrentIndex(0);
        return null; 
    }

    const getMediaUrl = (post: any) => {
      if (!post.media_urls || !Array.isArray(post.media_urls) || post.media_urls.length === 0) {
        return null;
      }
      
      const url = post.media_urls[0];
      if (!url || typeof url !== 'string') return null;
      
      return url.replace(/^(image::|video::|audio::)/, '');
    };

    const mediaUrl = getMediaUrl(currentPost);
    const isVideo = mediaUrl && isVideoUrl(mediaUrl);

    if (isVideo && mediaUrl) {
      return (
        <TikTokVideoPlayer
          src={mediaUrl}
          post={currentPost}
          user={user}
          isActive={activeTab === 'clips'} 
          onLike={() => handleLike(currentPost.id)}
          onComment={() => setOpeningCommentsFor(currentPost)}
          onShare={() => {
            toast({
              title: "Compartilhar",
              description: "Link copiado para a área de transferência!",
            });
          }}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      );
    }

    return (
      <div className="relative w-full h-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center p-8">
          <Flame className="h-24 w-24 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Clip não disponível</h2>
          <p className="text-gray-400 mb-6">
            Este clip não está mais disponível ou foi removido.
          </p>
          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
          >
            Próximo clip
          </Button>
        </div>
      </div>
    );
  };

  /* Componente para Feed */
  const TikTokFeedView = () => {
    if (verticalFeedPosts.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-white p-8">
          <Globe className="h-16 w-16 mb-4 text-gray-500" />
          <h2 className="text-xl font-bold mb-2">Nenhum post ainda</h2>
          <p className="text-gray-400 text-center mb-6">
            Seja o primeiro a compartilhar algo!
          </p>
          <Button
            onClick={() => setActiveTab('create')}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Criar primeiro post
          </Button>
        </div>
      );
    }
    
    const safeIndex = currentIndex % verticalFeedPosts.length;
    const currentPost = verticalFeedPosts[safeIndex];

    if (!currentPost) {
        setCurrentIndex(0);
        return null; 
    }
    
    const getMediaUrl = (post: any) => {
      if (!post.media_urls || !Array.isArray(post.media_urls) || post.media_urls.length === 0) {
        return null;
      }
      
      const url = post.media_urls[0];
      if (!url || typeof url !== 'string') return null;
      
      return url.replace(/^(image::|video::|audio::)/, '');
    };

    const mediaUrl = getMediaUrl(currentPost);
    const isVideo = mediaUrl && isVideoUrl(mediaUrl);

    return (
      <div className="h-full bg-gradient-to-b from-gray-900 to-black overflow-hidden relative">
        <ScrollArea className="h-full w-full">
            <div className="p-6 max-w-2xl mx-auto min-h-full flex flex-col justify-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Feed</h2>
                <p className="text-gray-400">
                  Post {currentIndex + 1} de {verticalFeedPosts.length}
                </p>
              </div>

              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar>
                        <AvatarImage src={currentPost.profiles?.avatar_url}/>
                        <AvatarFallback>
                          {currentPost.profiles?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <UserLink 
                          userId={currentPost.user_id} 
                          username={currentPost.profiles?.username||""} 
                          className="font-bold text-white hover:underline"
                        >
                          @{currentPost.profiles?.username}
                        </UserLink>
                        <p className="text-gray-400 text-sm">
                          {new Date(currentPost.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {currentPost.content && (
                      <p className="text-white mb-6 text-lg">{currentPost.content}</p>
                    )}

                    {mediaUrl && (
                      <div className="mb-6 rounded-xl overflow-hidden">
                        {isVideo ? (
                          <video
                            src={mediaUrl}
                            className="w-full h-auto max-h-96 rounded-lg"
                            controls
                            playsInline
                          />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt={`Mídia de ${currentPost.profiles?.username}`}
                            className="w-full h-auto max-h-96 object-cover rounded-lg"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                      <Button
                        variant="ghost"
                        className={cn(
                          "text-white",
                          currentPost.likes?.some((l:any) => l.user_id === user?.id) && "text-red-500"
                        )}
                        onClick={() => handleLike(currentPost.id)}
                      >
                        <Heart className={cn(
                          "h-6 w-6 mr-2",
                          currentPost.likes?.some((l:any) => l.user_id === user?.id) && "fill-current"
                        )} />
                        <span>{currentPost.likes?.length || 0}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        className="text-white"
                        onClick={() => setOpeningCommentsFor(currentPost)}
                      >
                        <MessageCircle className="h-6 w-6 mr-2" />
                        <span>{currentPost.comments?.length || 0}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center mt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="text-white border-gray-700"
                >
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Anterior
                </Button>
                
                <span className="text-gray-400 text-sm">
                  {currentIndex + 1} / {verticalFeedPosts.length}
                </span>
                
                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex === verticalFeedPosts.length - 1}
                  className="text-white border-gray-700"
                >
                  Próximo
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
        </ScrollArea>
      </div>
    );
  };

  /* Componente para Criação */
  const TikTokCreateView = () => {
    const [newPost, setNewPost] = useState("");
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'viral_clips'>('standard');
    
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      Promise.all(files.map(processMediaFile))
        .then(processedFiles => {
            setMediaFiles(prev => [...prev, ...processedFiles]);
        })
        .catch(error => {
            console.error("Erro no processamento de arquivos:", error);
            toast({ 
                variant: "destructive", 
                title: "Erro no arquivo", 
                description: "Não foi possível processar a mídia." 
            });
        });
    };

    const handleCreatePost = async () => {
      if (!newPost.trim() && mediaFiles.length === 0) { 
        toast({ variant: "destructive", title: "Conteúdo vazio" }); 
        return; 
      }
      
      setUploading(true);
      try {
        const mediaUrls: string[] = [];
        
        for (const file of mediaFiles) {
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user?.id}/${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`; 
          
          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(path, file);
          
          if (uploadError) throw uploadError;
          
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
        const { error } = await supabase
          .from("posts")
          .insert({ 
            user_id: user?.id, 
            content, 
            media_urls: mediaUrls.length ? mediaUrls : null, 
            audio_url: null,
            post_type: postType, 
            voting_ends_at: ends.toISOString(), 
            voting_period_active: true 
          });
        
        if (error) throw error;
        
        toast({ 
          title: "Post publicado! 🎉",
          description: "Seu conteúdo foi publicado com sucesso!"
        });
        
        setNewPost(""); 
        setMediaFiles([]);
        refetch(); 
        setActiveTab('clips'); 
        
      } catch (e: any) { 
        toast({ 
          variant: "destructive", 
          title: "Erro ao publicar", 
          description: e.message || "Tente novamente" 
        }); 
      } finally { 
        setUploading(false); 
      }
    };

    return (
      <div className="h-full bg-gradient-to-b from-gray-900 to-black text-white overflow-y-auto">
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveTab('feed')} 
                className="text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-bold">Criar Post</h1>
            </div>
            <Button
              onClick={handleCreatePost}
              disabled={uploading || (!newPost.trim() && mediaFiles.length === 0)}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Publicar"
              )}
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <Button 
              variant={postType==='standard'?"default":"outline"} 
              onClick={()=>setPostType('standard')} 
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
              onClick={()=>setPostType('viral_clips')} 
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
                  ? "No que está pensando?" 
                  : "Adicione uma descrição para o seu Clip..."
              }
              className="w-full bg-transparent border border-white/20 rounded-xl p-4 text-white placeholder-white/50 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Adicionar mídia</h3>
            <div className="grid grid-cols-2 gap-3">
              <input 
                ref={galleryInputRef} 
                type="file" 
                multiple 
                accept="image/*,video/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <Button 
                variant="outline"
                onClick={()=>galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-24 border-dashed border-white/30 text-white hover:bg-white/10"
              >
                <Images className="h-8 w-8 mb-2" />
                <span className="text-sm">Galeria</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                    toast({
                      title: "Funcionalidade em desenvolvimento",
                      description: "A captura direta de câmera não está implementada nesta versão."
                    });
                }}
                className="flex flex-col items-center justify-center h-24 border-dashed border-white/30 text-white hover:bg-white/10"
              >
                <Camera className="h-8 w-8 mb-2" />
                <span className="text-sm">Câmera</span>
              </Button>
            </div>
          </div>

          {mediaFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Mídias selecionadas:</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMediaFiles([])}
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
                      </div>
                    )}
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={()=>setMediaFiles(prev => prev.filter((_, index) => index !== i))}
                    >
                      <X className="h-3 w-3"/>
                    </Button>
                    <Badge className="absolute bottom-2 left-2 bg-black/70 text-white border-0">
                        {file.type.startsWith("video/") ? "Vídeo" : "Imagem"} ({Math.round(file.size / 1024 / 1024)}MB)
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* Renderização principal */
  const renderContent = () => {
    switch (activeTab) {
      case 'clips':
        return <TikTokClipsView />;
      case 'feed':
        return <TikTokFeedView />;
      case 'create':
        return <TikTokCreateView />;
      default:
        return null;
    }
  };

  /* Animação de swipe */
  const getSwipeAnimation = () => {
    if (!swipeDirection) return '';
    switch (swipeDirection) {
      case 'left':
        return 'animate-slide-in-left';
      case 'right':
        return 'animate-slide-in-right';
      case 'up':
      case 'down':
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>

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
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-gray-800"
                      onClick={() => setActiveTab('clips')}
                    >
                      <Home className="mr-3 h-4 w-4" />
                      Clips
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-gray-800"
                      onClick={() => setActiveTab('feed')}
                    >
                      <Globe className="mr-3 h-4 w-4" />
                      Feed
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-gray-800"
                      onClick={() => setActiveTab('create')}
                    >
                      <Pencil className="mr-3 h-4 w-4" />
                      Criar
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-gray-800"
                      onClick={() => setShowKeyboardHelp(true)}
                    >
                      <Keyboard className="mr-3 h-4 w-4" />
                      Atalhos
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="text-white">
              <h1 className="font-bold text-lg">World-Flow</h1>
              <p className="text-xs text-gray-400">
                {activeTab === 'clips' ? 'Clips' : 
                 activeTab === 'feed' ? 'Feed' : 
                 'Criar'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(activeTab === 'clips' && verticalClipPosts.length > 0) && (
              <div className="hidden md:flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                <span className="text-white text-sm">
                  {currentIndex + 1} / {verticalClipPosts.length}
                </span>
              </div>
            )}

            {(activeTab === 'feed' && verticalFeedPosts.length > 0) && (
              <div className="hidden md:flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                <span className="text-white text-sm">
                  {currentIndex + 1} / {verticalFeedPosts.length}
                </span>
              </div>
            )}

            <Badge className={cn(
              "hidden md:flex",
              activeTab === 'clips' ? "bg-gradient-to-r from-pink-500 to-orange-500" :
              activeTab === 'feed' ? "bg-gradient-to-r from-blue-500 to-purple-500" :
              "bg-gradient-to-r from-green-500 to-teal-500"
            )}>
              {isTouchDevice ? "Deslize para navegar" : "Use setas ou scroll"}
            </Badge>
            
            {!isTouchDevice && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setShowKeyboardHelp(true)}
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Área principal com gestos */}
      <div 
        className={`h-full w-full pt-16 pb-16 transition-transform duration-300 ease-out ${getSwipeAnimation()}`}
        onTouchStart={isTouchDevice ? handleTouchStart : undefined}
        onTouchMove={isTouchDevice ? handleTouchMove : undefined}
        onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
      >
        {renderContent()}
      </div>

      {/* CORREÇÃO: Indicadores corrigidos conforme layout espacial solicitado */}
      {isTouchDevice && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-30 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-4">
            <div className="flex flex-col items-center">
              <ArrowRight className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">Clips ←</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowLeft className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">→ Criar</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowUp className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">Anterior</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowDown className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">Próximo</span>
            </div>
          </div>
        </div>
      )}

      {/* CORREÇÃO: Indicadores para PC corrigidos */}
      {!isTouchDevice && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-30 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-4">
            <div className="flex flex-col items-center">
              <ArrowRight className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">→ Clips</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowLeft className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">Criar ←</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowUp className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">↑ Anterior</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowDown className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">↓ Próximo</span>
            </div>
            <div className="flex flex-col items-center">
              <MoveVertical className="h-4 w-4 text-white/70" />
              <span className="text-white/50 text-xs">Scroll</span>
            </div>
          </div>
        </div>
      )}

      {/* Navegação inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-40">
        <div className="flex items-center justify-around p-3">
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
          
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              activeTab === 'feed' 
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110" 
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            onClick={() => {
              setActiveTab('feed');
              setCurrentIndex(0); 
            }}
          >
            <Globe className="h-6 w-6" />
          </Button>
          
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
        </div>
      </div>

      {/* Dialog de ajuda do teclado */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Como Navegar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isTouchDevice && (
              <div className="space-y-3">
                <h3 className="font-semibold text-pink-400">No Celular (Gestos):</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Swipe Direita → Clips</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Swipe Esquerda → Criar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Swipe para Cima → Anterior Post</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Swipe para Baixo → Próximo Post</span>
                  </div>
                </div>
              </div>
            )}
            
            {!isTouchDevice && (
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-400">No Computador (Teclado):</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Seta Direita → Clips</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Seta Esquerda → Criar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Seta Cima → Anterior Post</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Seta Baixo → Próximo Post</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MoveVertical className="h-4 w-4" />
                    <span className="text-gray-300 text-sm">Scroll (Wheel) → Navegar posts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">Espaço</span>
                    <span className="text-gray-400 text-xs">Play/Pause (Clips)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">ESC</span>
                    <span className="text-gray-400 text-xs">Voltar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">Ctrl/Cmd + 1/2/3</span>
                    <span className="text-gray-400 text-xs">Abas (Clips/Feed/Criar)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">L</span>
                    <span className="text-gray-400 text-xs">Curtir</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">C</span>
                    <span className="text-gray-400 text-xs">Comentar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">M</span>
                    <span className="text-gray-400 text-xs">Mutar/Ativar som</span>
                  </div>
                </div>
              </div>
            )}
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