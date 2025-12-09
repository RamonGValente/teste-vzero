import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, X, Pencil, Trash2,
  Camera, Video, Minimize2, Images, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Sparkles, Wand2,
  Clock, Loader2, Flame, TrendingUp, Bomb, Users, Zap, Globe, Zap as FlashIcon,
  RefreshCw, RotateCw, Menu, Home, User, Settings, ArrowUp, ArrowDown,
  MousePointer, Keyboard, ChevronUp, ChevronDown, Film
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
  onNextClip: () => void;
  onPreviousClip: () => void;
  hasNextClip: boolean;
  hasPreviousClip: boolean;
}

const TikTokVideoPlayer = ({ 
  src, 
  post, 
  user, 
  isActive,
  onLike,
  onComment,
  onShare,
  onNextClip,
  onPreviousClip,
  hasNextClip,
  hasPreviousClip
}: TikTokVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
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

  const handleVideoClick = () => {
    togglePlay();
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-purple-900 to-pink-900">
      <div className="absolute top-4 left-4 z-10">
        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-lg">
          <Film className="h-3 w-3 mr-1" />
          CLIPS
        </Badge>
      </div>
      
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
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-800/50">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
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
                  className="h-14 w-14 rounded-full bg-purple-900/60 text-white hover:bg-purple-800/80 mb-1"
                  onClick={onLike}
                >
                  <Heart className={cn("h-7 w-7", isLiked && "fill-current text-pink-400")} />
                </Button>
                <span className="text-white text-xs font-medium">{post.likes?.length || 0}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Curtir</p>
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
                  className="h-14 w-14 rounded-full bg-purple-900/60 text-white hover:bg-purple-800/80 mb-1"
                  onClick={onComment}
                >
                  <MessageCircle className="h-7 w-7" />
                </Button>
                <span className="text-white text-xs font-medium">{post.comments?.length || 0}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Comentar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full bg-purple-900/60 text-white hover:bg-purple-800/80"
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
              <p>{isMuted ? "Ativar som" : "Desativar som"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Botões de navegação horizontal para clips */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-purple-900/60 text-white hover:bg-purple-800/80 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={onPreviousClip}
          disabled={!hasPreviousClip}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-purple-900/60 text-white hover:bg-purple-800/80 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={onNextClip}
          disabled={!hasNextClip}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="absolute bottom-24 left-4 right-20 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 ring-2 ring-purple-500/50">
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
          <Badge className="bg-purple-700/50 text-white border-0">
            <Film className="h-3 w-3 mr-1" />
            Clip {post.clipIndex ? `#${post.clipIndex}` : ''}
          </Badge>
          <span className="text-white/70 text-xs">
            {new Date(post.created_at).toLocaleDateString('pt-BR')}
          </span>
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

/* ---------- COMPONENTE PRINCIPAL ---------- */
export default function WorldFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /* Estados principais */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openingCommentsFor, setOpeningCommentsFor] = useState<any>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [clipIndex, setClipIndex] = useState(0); // Índice para navegação horizontal nos clips

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
  const standardPosts = posts?.filter(x => x.post_type === 'standard') || [];
  const clipPosts = posts?.filter(x => x.post_type === 'viral_clips') || [];
  
  /* Combinar posts: após 2 posts normais, inserir os clips */
  const [combinedPosts, setCombinedPosts] = useState<any[]>([]);
  
  useEffect(() => {
    if (!standardPosts.length && !clipPosts.length) return;
    
    const combined = [...standardPosts];
    
    // Se houver clips, inserir após o segundo post normal
    if (clipPosts.length > 0 && standardPosts.length >= 2) {
      // Adicionar índice aos clips para identificação
      const clipsWithIndex = clipPosts.map((clip, idx) => ({
        ...clip,
        clipIndex: idx + 1
      }));
      combined.splice(2, 0, ...clipsWithIndex);
    } else if (clipPosts.length > 0) {
      // Se não houver 2 posts normais, adicionar clips no final
      const clipsWithIndex = clipPosts.map((clip, idx) => ({
        ...clip,
        clipIndex: idx + 1
      }));
      combined.push(...clipsWithIndex);
    }
    
    setCombinedPosts(combined);
  }, [standardPosts, clipPosts]);

  const currentPost = combinedPosts[currentIndex];
  const isClipPost = currentPost?.post_type === 'viral_clips';
  
  // Determinar cor de fundo baseada no tipo de post
  const backgroundColorClass = isClipPost 
    ? "bg-gradient-to-b from-purple-900/30 to-pink-900/30" 
    : "bg-gradient-to-b from-gray-900 to-black";

  /* Calcular índices dos clips na lista combinada */
  const clipIndices = combinedPosts
    .map((post, idx) => post.post_type === 'viral_clips' ? idx : -1)
    .filter(idx => idx !== -1);

  const currentClipIndexInArray = clipIndices.findIndex(idx => idx === currentIndex);
  const hasNextClip = currentClipIndexInArray < clipIndices.length - 1;
  const hasPreviousClip = currentClipIndexInArray > 0;

  /* Handlers de navegação vertical */
  const handleNext = useCallback(() => {
    if (currentIndex < combinedPosts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, combinedPosts.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  /* Handlers de navegação horizontal para clips */
  const handleNextClip = useCallback(() => {
    if (hasNextClip) {
      const nextClipIndex = clipIndices[currentClipIndexInArray + 1];
      setCurrentIndex(nextClipIndex);
      setClipIndex(prev => prev + 1);
    }
  }, [hasNextClip, clipIndices, currentClipIndexInArray]);

  const handlePreviousClip = useCallback(() => {
    if (hasPreviousClip) {
      const prevClipIndex = clipIndices[currentClipIndexInArray - 1];
      setCurrentIndex(prevClipIndex);
      setClipIndex(prev => prev - 1);
    }
  }, [hasPreviousClip, clipIndices, currentClipIndexInArray]);

  /* Eventos de wheel (scroll) */
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      e.preventDefault();
      
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleNext, handlePrevious]);

  /* Eventos de teclado simplificados */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement instanceof HTMLInputElement || 
                             document.activeElement instanceof HTMLTextAreaElement;
      
      if (isInputFocused && e.key !== 'Escape') {
        return;
      }
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          handleNext();
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          handlePrevious();
          break;
          
        case 'ArrowRight':
          if (isClipPost) {
            e.preventDefault();
            handleNextClip();
          }
          break;
          
        case 'ArrowLeft':
          if (isClipPost) {
            e.preventDefault();
            handlePreviousClip();
          }
          break;
          
        case ' ': 
          if (isClipPost) {
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
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isClipPost, handleNext, handlePrevious, handleNextClip, handlePreviousClip, openingCommentsFor]);

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

  /* Handlers de ações */
  const handleLike = async (postId: string) => {
    try {
      const post = combinedPosts.find(p => p.id === postId);
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

  /* Renderização do post atual */
  const renderCurrentPost = () => {
    if (!currentPost) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-white p-8">
          <Globe className="h-16 w-16 mb-4 text-gray-500" />
          <h2 className="text-xl font-bold mb-2">Nenhum post disponível</h2>
          <p className="text-gray-400 text-center mb-6">
            Seja o primeiro a compartilhar algo!
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Criar primeiro post
          </Button>
        </div>
      );
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

    if (currentPost.post_type === 'viral_clips' && isVideo && mediaUrl) {
      return (
        <TikTokVideoPlayer
          src={mediaUrl}
          post={currentPost}
          user={user}
          isActive={true}
          onLike={() => handleLike(currentPost.id)}
          onComment={() => setOpeningCommentsFor(currentPost)}
          onShare={() => {
            toast({
              title: "Compartilhar",
              description: "Link copiado para a área de transferência!",
            });
          }}
          onNextClip={handleNextClip}
          onPreviousClip={handlePreviousClip}
          hasNextClip={hasNextClip}
          hasPreviousClip={hasPreviousClip}
        />
      );
    }

    // Renderização para posts normais
    return (
      <div className="h-full overflow-hidden relative">
        <ScrollArea className="h-full w-full">
          <div className="p-6 max-w-2xl mx-auto min-h-full flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-400" />
                Feed
              </h2>
              <p className="text-gray-400">
                Post {currentIndex + 1} de {combinedPosts.length}
              </p>
            </div>

            <Card className="bg-gray-800/50 border-gray-700/50 overflow-hidden backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarImage src={currentPost.profiles?.avatar_url}/>
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-cyan-600">
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
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      Post
                    </Badge>
                  </div>

                  {currentPost.content && (
                    <p className="text-white mb-6 text-lg">{currentPost.content}</p>
                  )}

                  {mediaUrl && (
                    <div className="mb-6 rounded-xl overflow-hidden border border-gray-700/50">
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

                  <div className="flex items-center gap-4 pt-4 border-t border-gray-700/50">
                    <Button
                      variant="ghost"
                      className={cn(
                        "text-white hover:bg-blue-500/20",
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
                      className="text-white hover:bg-blue-500/20"
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
                className="text-white border-gray-700 hover:bg-blue-500/20 hover:border-blue-500/30"
              >
                <ChevronUp className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              
              <span className="text-gray-400 text-sm">
                {currentIndex + 1} / {combinedPosts.length}
              </span>
              
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === combinedPosts.length - 1}
                className="text-white border-gray-700 hover:bg-blue-500/20 hover:border-blue-500/30"
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

  /* Componente para Criação (Modal) */
  const CreatePostModal = () => {
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
        setShowCreateModal(false);
        
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
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Criar Post
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
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
                <Film className="h-4 w-4 mr-2" />
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
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={uploading || (!newPost.trim() && mediaFiles.length === 0)}
              className={cn(
                "bg-gradient-to-r hover:opacity-90",
                postType === 'standard' 
                  ? "from-blue-500 to-purple-500" 
                  : "from-pink-500 to-orange-500"
              )}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className={`fixed inset-0 overflow-hidden transition-colors duration-500 ${backgroundColorClass}`}>
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
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Pencil className="mr-3 h-4 w-4" />
                      Criar Post
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="text-white">
              <h1 className="font-bold text-lg">World-Flow</h1>
              <p className="text-xs text-gray-400">
                {isClipPost ? (
                  <span className="flex items-center gap-1">
                    <Film className="h-3 w-3 text-purple-400" />
                    Clip {currentClipIndexInArray + 1} de {clipIndices.length}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-blue-400" />
                    Feed {currentIndex + 1} de {combinedPosts.length}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Área principal */}
      <div className="h-full w-full pt-16 pb-16">
        {renderCurrentPost()}
      </div>

      {/* Indicadores de navegação */}
      <div className="fixed bottom-20 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-4">
          <div className="flex flex-col items-center">
            <ArrowUp className="h-4 w-4 text-white/70" />
            <span className="text-white/50 text-xs">Anterior</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowDown className="h-4 w-4 text-white/70" />
            <span className="text-white/50 text-xs">Próximo</span>
          </div>
          {isClipPost && (
            <>
              <div className="flex flex-col items-center">
                <ChevronLeft className="h-4 w-4 text-white/70" />
                <span className="text-white/50 text-xs">Clip Anterior</span>
              </div>
              <div className="flex flex-col items-center">
                <ChevronRight className="h-4 w-4 text-white/70" />
                <span className="text-white/50 text-xs">Próximo Clip</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botão flutuante para criação */}
      <Button
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg hover:from-green-600 hover:to-teal-600 z-40"
        onClick={() => setShowCreateModal(true)}
      >
        <Pencil className="h-6 w-6" />
      </Button>

      {/* Modal de criação */}
      <CreatePostModal />

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