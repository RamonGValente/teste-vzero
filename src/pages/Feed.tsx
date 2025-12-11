import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send,
  Camera, Video, Images, Play,
  ChevronLeft, ChevronRight, Volume2, VolumeX,
  Clock, Loader2, Globe,
  Menu, ArrowDown,
  Film, Plus, Bomb, Timer
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

/* ---------- FUNÇÕES DE COMPRESSÃO DE ARQUIVOS (CORRIGIDAS) ---------- */
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
        if (!ctx) { reject(new Error('Canvas context not available')); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg', { 
                type: 'image/jpeg', 
                lastModified: Date.now() 
              });
              resolve(compressedFile);
            } else { reject(new Error('Failed to compress image')); }
          }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

const compressVideo = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // No celular, vamos apenas retornar o arquivo original se for pequeno
    if (file.size < 50 * 1024 * 1024) { 
      resolve(file); 
      return; 
    }
    
    // Para vídeos grandes, tentar compressão básica
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    
    video.onloadedmetadata = () => {
      // Para celular, melhor não comprimir muito
      const compressedFile = new File([file], file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4', { 
        type: 'video/mp4', 
        lastModified: Date.now() 
      });
      URL.revokeObjectURL(videoUrl);
      resolve(compressedFile);
    };
    
    video.onerror = () => { 
      URL.revokeObjectURL(videoUrl); 
      // Se falhar, retorna o arquivo original
      resolve(file);
    };
    
    // Timeout para segurança
    setTimeout(() => {
      URL.revokeObjectURL(videoUrl);
      resolve(file);
    }, 5000);
  });
};

const processMediaFile = async (file: File): Promise<File> => {
  try {
    console.log(`Processando arquivo: ${file.name}, tipo: ${file.type}, tamanho: ${file.size}`);
    
    if (file.type.startsWith('image/')) {
      console.log('Comprimindo imagem...');
      const compressed = await compressImage(file);
      console.log(`Imagem comprimida: ${compressed.name}, tamanho: ${compressed.size}`);
      return compressed;
    }
    else if (file.type.startsWith('video/')) {
      console.log('Comprimindo vídeo...');
      const compressed = await compressVideo(file);
      console.log(`Vídeo comprimido: ${compressed.name}, tamanho: ${compressed.size}`);
      return compressed;
    }
    
    console.log('Arquivo não é imagem nem vídeo, retornando original');
    return file;
  } catch (error) {
    console.error('Erro ao comprimir arquivo:', error);
    // Em caso de erro, retorna o arquivo original
    return file;
  }
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

/* ---------- COMPONENTE: VideoPlayer TikTok (Clips) ---------- */
interface TikTokVideoPlayerProps {
  src: string;
  post: any;
  user: any;
  onLike: () => void;
  onComment: () => void;
  hasPrevClip: boolean;
  hasNextClip: boolean;
  onNextClip: () => void;
  onPreviousClip: () => void;
}

const TikTokVideoPlayer = ({ 
  src, post, user, onLike, onComment, 
  hasPrevClip, hasNextClip 
}: TikTokVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);

  useEffect(() => {
    setIsPlaying(true);
    return () => setIsPlaying(false);
  }, [post.id]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(e => console.log("Interação necessária para play com som", e));
      else videoRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Indicador de Área de Clips */}
      <div className="absolute top-20 left-4 z-20">
        <Badge className="bg-black/40 backdrop-blur-md text-white border-white/10 shadow-lg px-3 py-1 hover:bg-black/60 transition-colors">
          <Film className="h-3 w-3 mr-2 text-pink-500 animate-pulse" />
          CLIPS
        </Badge>
      </div>
      
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        loop
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onClick={() => setIsPlaying(!isPlaying)}
      />
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Play className="h-16 w-16 text-white/50" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 z-30">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Botões Laterais */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20">
        <div className="flex flex-col items-center group">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all active:scale-90"
            onClick={onLike}
          >
            <Heart className={cn("h-7 w-7 transition-colors drop-shadow-md", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
          </Button>
          <span className="text-white text-xs font-bold drop-shadow-md mt-1">{post.likes?.length || 0}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all active:scale-90"
            onClick={onComment}
          >
            <MessageCircle className="h-7 w-7 drop-shadow-md" />
          </Button>
          <span className="text-white text-xs font-bold drop-shadow-md mt-1">{post.comments?.length || 0}</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all active:scale-90"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="h-6 w-6 drop-shadow-md" /> : <Volume2 className="h-6 w-6 drop-shadow-md" />}
        </Button>
      </div>
      
      {/* Navegação Horizontal Visual */}
      <div className="absolute top-1/2 left-2 z-10 -translate-y-1/2 pointer-events-none">
        {hasPrevClip && (
            <div className="animate-pulse bg-black/20 p-2 rounded-full backdrop-blur-sm">
                <ChevronLeft className="h-6 w-6 text-white/70" />
            </div>
        )}
      </div>
      <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2 pointer-events-none">
        {hasNextClip && (
            <div className="animate-pulse bg-black/20 p-2 rounded-full backdrop-blur-sm">
                <ChevronRight className="h-6 w-6 text-white/70" />
            </div>
        )}
      </div>

      {/* Info do Post */}
      <div className="absolute bottom-6 left-0 right-16 p-4 text-white z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/30 shadow-lg">
            <AvatarImage src={post.profiles?.avatar_url}/>
            <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-orange-500 font-bold">
              {post.profiles?.username?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
             <UserLink 
              userId={post.user_id} 
              username={post.profiles?.username || ''}
              className="font-bold text-white text-md drop-shadow-md hover:text-pink-300 transition-colors"
            >
              @{post.profiles?.username}
            </UserLink>
            <span className="text-xs text-white/70 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(post.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <p className="text-white/95 text-sm mb-2 line-clamp-3 font-medium drop-shadow-md leading-relaxed pr-4">
            {post.content}
        </p>
      </div>
    </div>
  );
};

/* ---------- COMPONENTE PRINCIPAL ---------- */
export default function WorldFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [verticalIndex, setVerticalIndex] = useState(0);
  const [horizontalClipIndex, setHorizontalClipIndex] = useState(0);

  const [openingCommentsFor, setOpeningCommentsFor] = useState<any>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Gestos
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);

  /* Query dos posts - SÓ MOSTRA APROVADOS */
  const { data: rawPosts, refetch: refetchFeed } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *, 
            profiles:user_id (id, username, avatar_url, full_name), 
            likes (id, user_id), 
            comments (id)
          `)
          .eq("is_community_approved", true) // SÓ POSTS APROVADOS
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(post => ({
          ...post,
          media_urls: Array.isArray(post.media_urls) ? post.media_urls.filter(url => url && typeof url === 'string').map(url => url.trim()) : []
        }));
      } catch (error) { console.error("Erro query posts:", error); return []; }
    },
    enabled: !!user,
  });

  /* Query para verificar posts na arena (para notificações) */
  const { data: arenaPosts, refetch: refetchArena } = useQuery({
    queryKey: ["arena-posts", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *, 
            profiles:user_id (id, username, avatar_url, full_name),
            post_votes (id, user_id, vote_type)
          `)
          .eq("user_id", user?.id)
          .eq("is_community_approved", false)
          .eq("voting_period_active", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) { console.error("Erro query arena posts:", error); return []; }
    },
    enabled: !!user,
  });

  /* LÓGICA DE ESTRUTURAÇÃO DO FEED */
  const feedStructure = useMemo(() => {
    if (!rawPosts) return [];
    const standardPosts = rawPosts.filter(p => p.post_type === 'standard');
    const clipPosts = rawPosts.filter(p => p.post_type === 'viral_clips');
    const structure: any[] = [];
    const initialBatch = standardPosts.slice(0, 3);
    initialBatch.forEach(post => structure.push({ type: 'standard', data: post }));
    if (clipPosts.length > 0) {
      structure.push({ type: 'clip_container', items: clipPosts });
    }
    const remainingBatch = standardPosts.slice(3);
    remainingBatch.forEach(post => structure.push({ type: 'standard', data: post }));
    return structure;
  }, [rawPosts]);

  const currentFeedItem = feedStructure[verticalIndex];

  /* --- Controles de Navegação --- */
  const goDown = useCallback(() => {
    if (verticalIndex < feedStructure.length - 1) setVerticalIndex(prev => prev + 1);
  }, [verticalIndex, feedStructure.length]);

  const goUp = useCallback(() => {
    if (verticalIndex > 0) setVerticalIndex(prev => prev - 1);
  }, [verticalIndex]);

  const goRight = useCallback(() => {
    if (currentFeedItem?.type === 'clip_container') {
      if (horizontalClipIndex < currentFeedItem.items.length - 1) setHorizontalClipIndex(prev => prev + 1);
    }
  }, [currentFeedItem, horizontalClipIndex]);

  const goLeft = useCallback(() => {
    if (currentFeedItem?.type === 'clip_container') {
      if (horizontalClipIndex > 0) setHorizontalClipIndex(prev => prev - 1);
    }
  }, [currentFeedItem, horizontalClipIndex]);

  /* --- Handlers de Input --- */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const xDiff = touchStart.x - touchEnd.x;
    const yDiff = touchStart.y - touchEnd.y;
    const minSwipe = 50;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (Math.abs(xDiff) > minSwipe && currentFeedItem?.type === 'clip_container') {
        if (xDiff > 0) goRight(); else goLeft();
      }
    } else {
      if (Math.abs(yDiff) > minSwipe) {
        if (yDiff > 0) goDown(); else goUp();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) > 20) {
        if (e.deltaY > 0) goDown(); else goUp();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [goDown, goUp]);

  /* --- Função para curtir posts no feed (usando tabela likes) --- */
  const handleLike = async (postId: string) => {
    try {
      const post = rawPosts?.find(p => p.id === postId);
      if (!post) return;
      const hasLiked = post.likes?.some((l:any) => l.user_id === user?.id);
      if (hasLiked) {
        const likeId = post.likes.find((l:any) => l.user_id === user?.id)?.id;
        if (likeId) await supabase.from("likes").delete().eq("id", likeId);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
      }
      refetchFeed();
    } catch (e) { console.error(e); }
  };

  /* --- Função para adicionar comentários --- */
  const addComment = useMutation({
    mutationFn: async () => { 
      if (openingCommentsFor && newCommentText.trim()) {
        const { data, error } = await supabase
          .from("comments")
          .insert({ post_id: openingCommentsFor.id, user_id: user!.id, content: newCommentText.trim() })
          .select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => { 
      setNewCommentText(""); 
      queryClient.invalidateQueries({ queryKey: ["post-comments"] }); 
      refetchFeed(); 
    },
    onError: (err) => toast({ variant: "destructive", title: "Erro", description: err.message })
  });

  /* --- Query para buscar comentários --- */
  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id], 
    enabled: !!openingCommentsFor,
    queryFn: async () => {
      if (!openingCommentsFor) return [];
      const { data } = await supabase
        .from("comments")
        .select(`*, profiles!comments_user_id_fkey(username, avatar_url)`)
        .eq("post_id", openingCommentsFor.id)
        .order("created_at", { ascending: true });
      return data || [];
    }
  });

  /* --- Helper para obter URL da mídia --- */
  const getMediaUrl = (post: any) => {
    if (!post?.media_urls?.length) return null;
    return post.media_urls[0].replace(/^(image::|video::|audio::)/, '');
  };

  /* --- Renderização do Conteúdo --- */
  const renderContent = () => {
    if (!currentFeedItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white p-8 animate-in fade-in bg-gray-950">
          <Globe className="h-24 w-24 text-blue-600 mb-6 opacity-30 animate-pulse" />
          <h2 className="text-2xl font-bold tracking-tight">Tudo calmo por aqui...</h2>
          <p className="text-gray-400 mt-2 text-center max-w-md">
            Os posts mais votados na Arena aparecerão aqui!<br/>
            {arenaPosts && arenaPosts.length > 0 && (
              <span className="text-blue-400 font-medium">
                Você tem {arenaPosts.length} post(s) sendo votado(s) na Arena!
              </span>
            )}
          </p>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full px-8 shadow-lg hover:shadow-blue-500/20"
          >
            Criar Novo Post
          </Button>
        </div>
      );
    }

    // 1. LINHA DE CLIPS
    if (currentFeedItem.type === 'clip_container') {
      const clip = currentFeedItem.items[horizontalClipIndex];
      const mediaUrl = getMediaUrl(clip);
      if (!mediaUrl) return <div className="h-full flex items-center justify-center text-white bg-black">Clip indisponível</div>;

      return (
        <TikTokVideoPlayer
          key={clip.id}
          src={mediaUrl}
          post={clip}
          user={user}
          onLike={() => handleLike(clip.id)}
          onComment={() => setOpeningCommentsFor(clip)}
          hasPrevClip={horizontalClipIndex > 0}
          hasNextClip={horizontalClipIndex < currentFeedItem.items.length - 1}
          onNextClip={goRight}
          onPreviousClip={goLeft}
        />
      );
    }

    // 2. POST STANDARD (IMERSIVO)
    const post = currentFeedItem.data;
    const mediaUrl = getMediaUrl(post);
    const isVideo = mediaUrl && isVideoUrl(mediaUrl);
    const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);

    return (
      <div className="h-full w-full relative bg-gray-900 overflow-hidden flex flex-col justify-center animate-in fade-in duration-500">
        
        {/* Background Layer - Imersivo */}
        <div className="absolute inset-0 z-0">
           {mediaUrl ? (
             <>
                {/* Imagem borrada de fundo para preencher espaço vazio */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-3xl z-0" />
                <img src={mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl scale-110" alt="" />
                
                {/* Mídia Principal Centralizada */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pb-24 md:pb-0">
                    {isVideo ? (
                      <video src={mediaUrl} className="w-full max-h-[80vh] md:max-h-full object-contain shadow-2xl" controls playsInline />
                    ) : (
                      <img src={mediaUrl} alt="Post media" className="w-full max-h-[75vh] md:max-h-full object-contain shadow-2xl drop-shadow-2xl" />
                    )}
                </div>
             </>
           ) : (
             <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950" />
           )}
        </div>

        {/* Overlay de Conteúdo Inferior (Estilo Instagram Reels/Stories) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-32 pb-8 px-5 flex flex-col justify-end">
            
            {/* Header do Post (Avatar e Nome) */}
            <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-11 w-11 ring-2 ring-blue-500/50 shadow-lg">
                <AvatarImage src={post.profiles?.avatar_url}/>
                <AvatarFallback className="bg-blue-600 text-white font-bold">{post.profiles?.username?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                <UserLink userId={post.user_id} username={post.profiles?.username||""} className="font-bold text-white text-lg hover:text-blue-400 drop-shadow-md">
                    @{post.profiles?.username}
                </UserLink>
                <div className="flex items-center gap-2 text-xs text-gray-300/80">
                    <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                    <Badge variant="outline" className="text-[10px] h-4 border-blue-500/30 text-blue-300 px-1 py-0 bg-blue-500/10 backdrop-blur-sm">Post</Badge>
                </div>
                </div>
            </div>

            {/* Texto do Post */}
            {post.content && (
                <ScrollArea className="max-h-[30vh] w-full mb-4 pr-2">
                    <p className="text-white/95 text-base md:text-lg leading-relaxed font-medium drop-shadow-sm whitespace-pre-wrap">
                        {post.content}
                    </p>
                </ScrollArea>
            )}

            {/* Barra de Ações (Glassmorphism) */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className={cn("rounded-full h-10 px-4 bg-white/10 backdrop-blur-md border border-white/5 hover:bg-white/20 transition-all", isLiked ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-white")} 
                        onClick={() => handleLike(post.id)}
                    >
                        <Heart className={cn("h-5 w-5 mr-2", isLiked && "fill-current")} />
                        <span className="font-semibold">{post.likes?.length || 0}</span>
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="rounded-full h-10 px-4 bg-white/10 backdrop-blur-md border border-white/5 text-white hover:bg-white/20 transition-all"
                        onClick={() => setOpeningCommentsFor(post)}
                    >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        <span className="font-semibold">{post.comments?.length || 0}</span>
                    </Button>
                </div>
                
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-white/10 backdrop-blur-md text-white hover:bg-white/20">
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>

        {/* Indicador de Deslize */}
        {verticalIndex < feedStructure.length - 1 && (
             <div className="absolute bottom-2 left-0 right-0 flex justify-center z-30 pointer-events-none opacity-50">
                <ArrowDown className="h-5 w-5 text-white animate-bounce" />
             </div>
        )}
      </div>
    );
  };

  /* Modal de Criação - CORRIGIDO PARA CELULAR */
  const CreatePostModal = () => {
    const [newPost, setNewPost] = useState("");
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'viral_clips'>('standard');
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      console.log(`Arquivos selecionados: ${files.length}`);
      
      if (files.length === 0) return;
      
      try {
        // Processar arquivos um por um para melhor controle
        const processedFiles: File[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`Processando arquivo ${i + 1}/${files.length}: ${file.name}`);
          
          try {
            const processedFile = await processMediaFile(file);
            processedFiles.push(processedFile);
            console.log(`Arquivo ${file.name} processado com sucesso`);
          } catch (error) {
            console.error(`Erro ao processar ${file.name}:`, error);
            // Adiciona o arquivo original mesmo com erro
            processedFiles.push(file);
          }
        }
        
        setMediaFiles(processedFiles);
        console.log(`Total de arquivos processados: ${processedFiles.length}`);
      } catch (error) {
        console.error('Erro geral no processamento de arquivos:', error);
        toast({
          variant: "destructive",
          title: "Erro ao processar arquivos",
          description: "Alguns arquivos podem não ter sido processados corretamente."
        });
      }
    };

    const handleCreatePost = async () => {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Você precisa estar logado para criar um post."
        });
        return;
      }
      
      if (!newPost.trim() && mediaFiles.length === 0) {
        toast({ 
          variant: "destructive", 
          title: "Erro", 
          description: "Adicione texto ou mídia para postar" 
        });
        return;
      }
      
      setUploading(true);
      setUploadProgress(0);
      
      try {
        const mediaUrls: string[] = [];
        
        // Upload de mídias se houver
        if (mediaFiles.length > 0) {
          console.log(`Iniciando upload de ${mediaFiles.length} arquivos...`);
          
          for (let i = 0; i < mediaFiles.length; i++) {
            const file = mediaFiles[i];
            console.log(`Upload do arquivo ${i + 1}/${mediaFiles.length}: ${file.name}`);
            
            try {
              // Nome do arquivo seguro para URL
              const safeFileName = file.name
                .toLowerCase()
                .replace(/[^a-z0-9.]/g, '_')
                .replace(/_+/g, '_');
              
              const path = `${user.id}/${Date.now()}-${safeFileName}`;
              
              console.log(`Fazendo upload para: ${path}`);
              
              // Fazer upload
              const { error: upErr } = await supabase.storage
                .from("media")
                .upload(path, file, {
                  cacheControl: '3600',
                  upsert: false
                });
              
              if (upErr) {
                console.error(`Erro no upload de ${file.name}:`, upErr);
                throw upErr;
              }
              
              // Obter URL pública
              const { data: urlData } = supabase.storage
                .from("media")
                .getPublicUrl(path);
              
              if (!urlData?.publicUrl) {
                throw new Error(`Não foi possível obter URL pública para ${file.name}`);
              }
              
              // Adicionar prefixo baseado no tipo
              let prefixedUrl = '';
              if (file.type.startsWith("video/")) {
                prefixedUrl = `video::${urlData.publicUrl}`;
              } else if (file.type.startsWith("image/")) {
                prefixedUrl = `image::${urlData.publicUrl}`;
              } else {
                prefixedUrl = `file::${urlData.publicUrl}`;
              }
              
              mediaUrls.push(prefixedUrl);
              console.log(`Upload concluído: ${prefixedUrl}`);
              
            } catch (fileError: any) {
              console.error(`Erro no arquivo ${file.name}:`, fileError);
              toast({
                variant: "destructive",
                title: "Erro no upload",
                description: `Erro ao enviar ${file.name}: ${fileError.message || 'Erro desconhecido'}`
              });
              continue; // Continua com outros arquivos
            }
            
            // Atualizar progresso
            setUploadProgress(Math.round(((i + 1) / mediaFiles.length) * 100));
          }
        }
        
        // Calcular data de término da votação (60 minutos a partir de agora)
        const votingEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        
        console.log('Criando post no banco de dados...');
        console.log('Dados do post:', {
          user_id: user.id,
          content: newPost,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          post_type: postType,
          voting_ends_at: votingEndsAt
        });
        
        // Criar post no banco de dados
        const { data: newPostData, error } = await supabase
          .from("posts")
          .insert({ 
            user_id: user.id, 
            content: newPost, 
            media_urls: mediaUrls.length > 0 ? mediaUrls : null, 
            post_type: postType, 
            voting_period_active: true, 
            voting_ends_at: votingEndsAt,
            is_community_approved: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.error('Erro ao criar post:', error);
          throw error;
        }
        
        console.log('Post criado com sucesso:', newPostData);
        
        // Notificação de sucesso
        toast({ 
          title: "🎯 Post enviado para a Arena!",
          description: (
            <div className="mt-2">
              <p>Seu post tem 60 minutos para receber votos!</p>
              <div className="flex items-center gap-2 mt-1">
                <Heart className="h-4 w-4 text-red-500" />
                <span>+1 Coração = +1 ponto</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Bomb className="h-4 w-4 text-gray-400" />
                <span>+1 Bomba = -1 ponto</span>
              </div>
              <p className="mt-2 font-medium">Boa sorte! 🍀</p>
            </div>
          ),
          duration: 5000 
        });
        
        // Limpar campos
        setNewPost(""); 
        setMediaFiles([]); 
        setShowCreateModal(false);
        
        // Atualizar queries
        queryClient.invalidateQueries({ queryKey: ["arena-posts"] });
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        
        // Aguardar um pouco e navegar para Arena
        setTimeout(() => {
          navigate('/arena');
        }, 2000);
        
      } catch (e: any) { 
        console.error('Erro geral ao criar post:', e);
        toast({ 
          variant: "destructive", 
          title: "Erro ao criar post", 
          description: e.message || "Erro desconhecido. Tente novamente." 
        }); 
      } 
      finally { 
        setUploading(false); 
        setUploadProgress(0);
      }
    };

    return (
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Criar Novo Post</span>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse">
                <Timer className="h-3 w-3 mr-1" /> 60min
              </Badge>
            </DialogTitle>
            <p className="text-sm text-gray-400">Seu post será enviado para a Arena para votação por 60 minutos</p>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
             <Button 
                variant={postType === 'standard' ? "default" : "outline"} 
                onClick={() => setPostType('standard')} 
                className={cn("h-12 border-gray-700", postType === 'standard' ? "bg-blue-600 hover:bg-blue-700" : "bg-transparent text-gray-400 hover:bg-gray-800")}
             >
                <Globe className="mr-2 h-4 w-4"/> Feed Padrão
             </Button>
             <Button 
                variant={postType === 'viral_clips' ? "default" : "outline"} 
                onClick={() => setPostType('viral_clips')} 
                className={cn("h-12 border-gray-700", postType === 'viral_clips' ? "bg-pink-600 hover:bg-pink-700" : "bg-transparent text-gray-400 hover:bg-gray-800")}
             >
                <Film className="mr-2 h-4 w-4"/> Clip Viral
             </Button>
          </div>
          
          <textarea 
            value={newPost} 
            onChange={(e) => setNewPost(e.target.value)} 
            placeholder="No que você está pensando? Seu post será votado na Arena por 60 minutos..." 
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 min-h-[120px] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none" 
          />
          
          <div className="flex gap-2 mt-2 items-center">
             <input 
               type="file" 
               ref={galleryInputRef} 
               multiple 
               className="hidden" 
               accept="image/*,video/*" 
               onChange={handleFileChange}
               capture="environment" // Para celular, permite usar câmera diretamente
             />
             <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
                onClick={() => galleryInputRef.current?.click()}
             >
                <Images className="mr-2 h-4 w-4"/> Adicionar Mídia
             </Button>
             
             {mediaFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-400 font-medium px-2 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    {mediaFiles.length} arquivo(s)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    onClick={() => setMediaFiles([])}
                  >
                    ×
                  </Button>
                </div>
             )}
          </div>
          
          {/* Mostrar progresso do upload */}
          {uploading && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Enviando...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-full">
                <Timer className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-blue-300 flex items-center gap-2">
                  Sistema de Votação da Arena
                  <Badge variant="outline" className="text-[10px] border-pink-500 text-pink-400">NOVO</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-red-500/20 p-1.5 rounded-full">
                      <Heart className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-400">Coração</p>
                      <p className="text-xs text-gray-400">+1 ponto</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-700/50 p-1.5 rounded-full">
                      <Bomb className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-400">Bomba</p>
                      <p className="text-xs text-gray-400">-1 ponto</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-blue-400/80 mt-3">
                  ⏱️ Seu post terá 60 minutos para receber votos. Se tiver mais corações que bombas ao final, será aprovado para o feed!
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleCreatePost} 
            disabled={uploading || (!newPost.trim() && mediaFiles.length === 0)} 
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 h-12 font-bold text-md shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {uploading ? (
               <div className="flex items-center">
                 <Loader2 className="animate-spin mr-2 h-4 w-4" />
                 {uploadProgress > 0 ? `Enviando... ${uploadProgress}%` : "Processando..."}
               </div>
             ) : (
               <>
                 <Send className="w-4 h-4 mr-2" />
                 Enviar para Votação (60min)
               </>
             )}
          </Button>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div 
      className="fixed inset-0 overflow-hidden bg-black touch-none font-sans" 
      onTouchStart={handleTouchStart} 
      onTouchMove={handleTouchMove} 
      onTouchEnd={handleTouchEnd}
    >
      {/* Header Fixo - Centralizado e Moderno */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 grid grid-cols-3 items-center bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none h-20 transition-all">
        
        {/* Lado Esquerdo: Menu */}
        <div className="justify-self-start pointer-events-auto">
            <Sheet open={showMenu} onOpenChange={setShowMenu}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-gray-900 border-gray-800 text-white">
                    <SheetHeader><SheetTitle className="text-white text-left">Menu</SheetTitle></SheetHeader>
                    <div className="mt-6 flex flex-col gap-4">
                        <UserLink userId={user?.id} username="Meu Perfil" className="font-bold text-lg hover:text-blue-400 transition-colors"/>
                        <Button 
                          variant="ghost" 
                          className="justify-start hover:bg-white/10 relative"
                          onClick={() => navigate('/arena')}
                        >
                          <div className="flex items-center">
                            <Timer className="h-4 w-4 mr-2" />
                            Arena de Votação
                            {arenaPosts && arenaPosts.length > 0 && (
                              <Badge className="ml-2 bg-red-500 animate-pulse">{arenaPosts.length}</Badge>
                            )}
                          </div>
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>

        {/* Centro: Logo Centralizada */}
        <div className="justify-self-center flex flex-col items-center pointer-events-auto">
            <h1 className="text-2xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] cursor-pointer select-none">
              World<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Flow</span>
            </h1>
            {currentFeedItem?.type === 'clip_container' && (
                <span className="text-[9px] text-pink-400 font-bold uppercase tracking-[0.2em] animate-pulse -mt-1">Modo Clips</span>
            )}
        </div>

        {/* Lado Direito: Botão de Criar Post */}
        <div className="justify-self-end pointer-events-auto">
            <Button 
                onClick={() => setShowCreateModal(true)} 
                size="icon" 
                className="rounded-full h-10 w-10 bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform border border-white/10 relative"
                title="Criar novo post"
            >
                <Plus className="h-6 w-6 text-white" />
                {arenaPosts && arenaPosts.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse border border-white"></span>
                )}
            </Button>
        </div>
      </div>

      {/* Área Principal */}
      <div className="w-full h-full pt-0 bg-black">
        {renderContent()}
      </div>

      {/* Modais */}
      <CreatePostModal />
      
      {/* Modal de Comentários */}
      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => !o && setOpeningCommentsFor(null)}>
        <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-xl border-gray-800 text-white max-h-[80vh] flex flex-col shadow-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-gray-800 bg-gray-900/50">
              <DialogTitle className="text-center font-bold">Comentários</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-4">
            {loadingComments ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div> : 
              comments?.length ? comments.map((c:any) => (
                <div key={c.id} className="flex gap-3 mb-4 animate-in slide-in-from-bottom-2">
                  <Avatar className="h-8 w-8 ring-1 ring-gray-700"><AvatarImage src={c.profiles?.avatar_url}/><AvatarFallback className="text-xs bg-gray-700">U</AvatarFallback></Avatar>
                  <div className="bg-gray-800/50 p-2 rounded-lg rounded-tl-none flex-1">
                    <span className="font-bold text-xs text-gray-400 block mb-1">{c.profiles?.username}</span>
                    <p className="text-sm text-white/90 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 opacity-50">
                    <MessageCircle className="h-10 w-10 mx-auto mb-2 text-gray-500"/>
                    <p className="text-sm">Nenhum comentário ainda.</p>
                </div>
              )
            }
          </ScrollArea>
          
          <div className="p-3 bg-gray-900 border-t border-gray-800">
            <div className="flex gap-2 relative">
                <Input 
                    value={newCommentText} 
                    onChange={e => setNewCommentText(e.target.value)} 
                    placeholder="Escreva um comentário..." 
                    className="bg-gray-800 border-gray-700 text-white focus-visible:ring-blue-500 pr-10 rounded-full pl-4"
                />
                <Button size="icon" onClick={() => addComment.mutate()} disabled={addComment.isPending || !newCommentText.trim()} className="absolute right-1 top-1 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-500">
                    <Send className="h-3 w-3"/>
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}