import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, X, Pencil,
  Camera, Video, Images, Play,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause,
  Clock, Loader2, Flame, Globe,
  Menu, ArrowUp, ArrowDown,
  ChevronUp, ChevronDown, Film, Plus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/* ---------- FUNÇÕES DE COMPRESSÃO DE ARQUIVOS (MANTIDAS) ---------- */
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
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg', { type: 'image/jpeg', lastModified: Date.now() });
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
    if (file.size < 10 * 1024 * 1024) { resolve(file); return; }
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      const compressedFile = new File([file], file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4', { type: 'video/mp4', lastModified: Date.now() });
      URL.revokeObjectURL(videoUrl);
      resolve(compressedFile);
    };
    video.onerror = () => { URL.revokeObjectURL(videoUrl); reject(new Error('Failed to load video')); };
  });
};

const processMediaFile = async (file: File): Promise<File> => {
  try {
    if (file.type.startsWith('image/')) return await compressImage(file);
    else if (file.type.startsWith('video/')) return await compressVideo(file);
    return file;
  } catch (error) {
    console.error('Erro ao comprimir arquivo:', error);
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
  hasPrevClip, hasNextClip, onNextClip, onPreviousClip 
}: TikTokVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Inicia pausado ou autoplay dependendo da politica
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);

  // Auto-play quando monta
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
      <div className="absolute top-4 left-4 z-20">
        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-lg px-3 py-1">
          <Film className="h-3 w-3 mr-2 animate-pulse" />
          ÁREA DE CLIPS
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
      
      {/* Play/Pause Icon Overlay (se pausado) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Play className="h-16 w-16 text-white/50" />
        </div>
      )}

      {/* Barra de progresso */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Botões Laterais (Ações) */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20">
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-transform active:scale-90"
            onClick={onLike}
          >
            <Heart className={cn("h-7 w-7 transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
          </Button>
          <span className="text-white text-xs font-bold drop-shadow-md">{post.likes?.length || 0}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
            onClick={onComment}
          >
            <MessageCircle className="h-7 w-7" />
          </Button>
          <span className="text-white text-xs font-bold drop-shadow-md">{post.comments?.length || 0}</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>
      
      {/* Navegação Horizontal Visual */}
      <div className="absolute top-1/2 left-2 z-10 -translate-y-1/2">
        {hasPrevClip && (
            <div className="animate-pulse bg-black/20 p-1 rounded-full">
                <ChevronLeft className="h-8 w-8 text-white/70" />
            </div>
        )}
      </div>
      <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2">
        {hasNextClip && (
            <div className="animate-pulse bg-black/20 p-1 rounded-full">
                <ChevronRight className="h-8 w-8 text-white/70" />
            </div>
        )}
      </div>

      {/* Info do Post */}
      <div className="absolute bottom-8 left-4 right-16 text-white z-10">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/50 shadow-lg">
            <AvatarImage src={post.profiles?.avatar_url}/>
            <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-orange-500">
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
            <span className="text-xs text-gray-200 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(post.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <p className="text-white/95 text-sm mb-2 line-clamp-3 font-medium drop-shadow-md leading-relaxed">
            {post.content}
        </p>
        
        {/* Dica de navegação */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-white/60 bg-black/30 w-fit px-2 py-1 rounded-full backdrop-blur-sm">
           <ArrowUp className="h-3 w-3" /> Posts Normais | <ChevronLeft className="h-3 w-3" /> Clips <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
};

/* ---------- COMPONENTE PRINCIPAL ---------- */
export default function WorldFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados de Navegação Matricial
  // verticalIndex: controla qual "linha" do feed estamos (0, 1, 2, 3 [clips], 4...)
  const [verticalIndex, setVerticalIndex] = useState(0);
  // horizontalClipIndex: controla qual vídeo estamos vendo quando estamos na linha de clips
  const [horizontalClipIndex, setHorizontalClipIndex] = useState(0);

  const [openingCommentsFor, setOpeningCommentsFor] = useState<any>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Gestos
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);

  /* Query dos posts */
  const { data: rawPosts, refetch } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`*, profiles:user_id (id, username, avatar_url, full_name), likes (id, user_id), comments (id), post_votes (id, user_id, vote_type)`)
          .eq("is_community_approved", true)
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

  /* LÓGICA DE ESTRUTURAÇÃO DO FEED (CORE) 
     Transforma a lista plana em uma estrutura onde o índice 3 é uma coleção de clips.
  */
  const feedStructure = useMemo(() => {
    if (!rawPosts) return [];

    const standardPosts = rawPosts.filter(p => p.post_type === 'standard');
    const clipPosts = rawPosts.filter(p => p.post_type === 'viral_clips');

    const structure: any[] = [];

    // Adiciona até 3 posts normais iniciais
    const initialBatch = standardPosts.slice(0, 3);
    initialBatch.forEach(post => structure.push({ type: 'standard', data: post }));

    // Se houver clips, cria o "Slot" de Clips
    if (clipPosts.length > 0) {
      structure.push({ 
        type: 'clip_container', 
        items: clipPosts // Array com todos os vídeos
      });
    }

    // Adiciona o restante dos posts normais
    const remainingBatch = standardPosts.slice(3);
    remainingBatch.forEach(post => structure.push({ type: 'standard', data: post }));

    return structure;
  }, [rawPosts]);

  // Item atual baseado no índice vertical
  const currentFeedItem = feedStructure[verticalIndex];
  
  // Se o item atual for container de clips, pegamos o clip específico
  const currentClip = currentFeedItem?.type === 'clip_container' 
    ? currentFeedItem.items[horizontalClipIndex] 
    : null;

  /* --- Controles de Navegação --- */

  const goDown = useCallback(() => {
    if (verticalIndex < feedStructure.length - 1) {
      setVerticalIndex(prev => prev + 1);
      // Opcional: Resetar o index horizontal ao sair e voltar?
      // setHorizontalClipIndex(0); // Deixe comentado se quiser memorizar onde parou nos clips
    }
  }, [verticalIndex, feedStructure.length]);

  const goUp = useCallback(() => {
    if (verticalIndex > 0) {
      setVerticalIndex(prev => prev - 1);
    }
  }, [verticalIndex]);

  const goRight = useCallback(() => {
    if (currentFeedItem?.type === 'clip_container') {
      if (horizontalClipIndex < currentFeedItem.items.length - 1) {
        setHorizontalClipIndex(prev => prev + 1);
      }
    }
  }, [currentFeedItem, horizontalClipIndex]);

  const goLeft = useCallback(() => {
    if (currentFeedItem?.type === 'clip_container') {
      if (horizontalClipIndex > 0) {
        setHorizontalClipIndex(prev => prev - 1);
      }
    }
  }, [currentFeedItem, horizontalClipIndex]);

  /* --- Handlers de Input (Wheel/Touch) --- */

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

    // Lógica de Prioridade:
    // Se estiver na área de clips, swipe horizontal tem prioridade.
    // Caso contrário, ou se o swipe for verticalmente forte, navega na vertical.

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      // Movimento Horizontal
      if (Math.abs(xDiff) > minSwipe) {
        if (currentFeedItem?.type === 'clip_container') {
          // Estamos nos clips, navegar lateralmente
          if (xDiff > 0) goRight(); // Swipe esquerda -> Próximo
          else goLeft(); // Swipe direita -> Anterior
        }
      }
    } else {
      // Movimento Vertical
      if (Math.abs(yDiff) > minSwipe) {
        if (yDiff > 0) goDown();
        else goUp();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Suporte a Mouse Wheel para Desktop
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Evita scroll dentro de inputs ou modais abertos (básico)
      if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
      
      e.preventDefault();
      // Threshold para evitar disparos muito rápidos
      if (Math.abs(e.deltaY) > 20) {
        if (e.deltaY > 0) goDown();
        else goUp();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [goDown, goUp]);

  /* --- Funções de Dados (Likes/Comments) --- */
  
  const handleLike = async (postId: string) => {
    try {
      // Encontrar post nos dados crus para atualizar otimista ou refetch
      const post = rawPosts?.find(p => p.id === postId);
      if (!post) return;
      
      const hasLiked = post.likes?.some((l:any) => l.user_id === user?.id);
      
      if (hasLiked) {
        const likeId = post.likes.find((l:any) => l.user_id === user?.id)?.id;
        if (likeId) await supabase.from("likes").delete().eq("id", likeId);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
      }
      refetch();
    } catch (e) { console.error(e); }
  };

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
      refetch(); 
    },
    onError: (err) => toast({ variant: "destructive", title: "Erro", description: err.message })
  });

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id], 
    enabled: !!openingCommentsFor,
    queryFn: async () => {
      if (!openingCommentsFor) return [];
      const { data } = await supabase
        .from("comments")
        .select(`*, author:profiles!comments_user_id_fkey(username, avatar_url)`)
        .eq("post_id", openingCommentsFor.id)
        .order("created_at", { ascending: true });
      return data || [];
    }
  });

  /* --- Renderização --- */

  // Função auxiliar para pegar URL limpa
  const getMediaUrl = (post: any) => {
    if (!post?.media_urls?.length) return null;
    return post.media_urls[0].replace(/^(image::|video::|audio::)/, '');
  };

  const renderContent = () => {
    if (!currentFeedItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white p-8 animate-in fade-in">
          <Globe className="h-20 w-20 text-blue-500 mb-4 opacity-50" />
          <h2 className="text-xl font-bold">Tudo calmo por aqui...</h2>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-blue-600 text-white">Criar Post</Button>
        </div>
      );
    }

    // 1. Renderização da LINHA DE CLIPS
    if (currentFeedItem.type === 'clip_container') {
      const clip = currentFeedItem.items[horizontalClipIndex];
      const mediaUrl = getMediaUrl(clip);
      
      // Se por acaso o clip não tiver mídia válida
      if (!mediaUrl) return <div className="h-full flex items-center justify-center text-white">Clip sem vídeo</div>;

      return (
        <TikTokVideoPlayer
          key={clip.id} // Key importante para resetar player ao mudar clip
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

    // 2. Renderização de POST STANDARD
    const post = currentFeedItem.data;
    const mediaUrl = getMediaUrl(post);
    const isVideo = mediaUrl && isVideoUrl(mediaUrl);

    return (
      <div className="h-full relative bg-gray-900 overflow-hidden flex flex-col">
        {/* Background Blur Effect */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
           {mediaUrl && <img src={mediaUrl} className="w-full h-full object-cover blur-3xl scale-110" alt="" />}
        </div>

        <ScrollArea className="flex-1 w-full z-10">
          <div className="min-h-full flex flex-col justify-center p-4 pb-24 md:p-8">
            <Card className="w-full max-w-xl mx-auto bg-gray-800/80 border-gray-700 backdrop-blur-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <CardContent className="p-0">
                {/* Header do Post */}
                <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
                  <Avatar className="h-10 w-10 ring-2 ring-blue-500/30">
                    <AvatarImage src={post.profiles?.avatar_url}/>
                    <AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <UserLink userId={post.user_id} username={post.profiles?.username||""} className="font-bold text-white hover:text-blue-400 block">
                      @{post.profiles?.username}
                    </UserLink>
                    <span className="text-gray-400 text-xs">
                        {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-blue-300 border-blue-500/30 bg-blue-500/10">Feed</Badge>
                </div>

                {/* Conteúdo Texto */}
                {post.content && (
                    <div className="p-4 text-white text-base leading-relaxed whitespace-pre-wrap">
                        {post.content}
                    </div>
                )}

                {/* Mídia */}
                {mediaUrl && (
                  <div className="bg-black w-full flex items-center justify-center max-h-[500px] overflow-hidden">
                    {isVideo ? (
                      <video src={mediaUrl} className="w-full h-auto max-h-[500px]" controls playsInline />
                    ) : (
                      <img src={mediaUrl} alt="Post media" className="w-full h-auto max-h-[500px] object-contain" />
                    )}
                  </div>
                )}

                {/* Footer Ações */}
                <div className="p-3 flex items-center justify-around bg-gray-900/50 border-t border-gray-700/50">
                    <Button variant="ghost" className="text-gray-300 hover:text-red-400 hover:bg-red-500/10 gap-2" onClick={() => handleLike(post.id)}>
                        <Heart className={cn("h-5 w-5", post.likes?.some((l:any) => l.user_id === user?.id) && "fill-current text-red-500")} />
                        {post.likes?.length || 0}
                    </Button>
                    <Button variant="ghost" className="text-gray-300 hover:text-blue-400 hover:bg-blue-500/10 gap-2" onClick={() => setOpeningCommentsFor(post)}>
                        <MessageCircle className="h-5 w-5" />
                        {post.comments?.length || 0}
                    </Button>
                    <Button variant="ghost" className="text-gray-300 hover:text-green-400 hover:bg-green-500/10">
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Indicador de Posição Inferior */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
            <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-2 text-xs text-white/60 flex items-center gap-2">
                {verticalIndex < feedStructure.length - 1 && (
                    <span className="flex items-center animate-bounce"><ArrowDown className="h-3 w-3 mr-1" /> Deslize para baixo</span>
                )}
            </div>
        </div>
      </div>
    );
  };

  /* Modal de Criação (Reutilizado com pequenas melhorias visuais) */
  const CreatePostModal = () => {
    const [newPost, setNewPost] = useState("");
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'viral_clips'>('standard');
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      Promise.all(files.map(processMediaFile)).then(setMediaFiles).catch(console.error);
    };

    const handleCreatePost = async () => {
      if (!newPost.trim() && mediaFiles.length === 0) return;
      setUploading(true);
      try {
        const mediaUrls: string[] = [];
        for (const file of mediaFiles) {
          const path = `${user?.id}/${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, '_')}`; 
          const { error: upErr } = await supabase.storage.from("media").upload(path, file);
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
          if (file.type.startsWith("video/")) mediaUrls.push(`video::${urlData.publicUrl}`);
          else mediaUrls.push(`image::${urlData.publicUrl}`);
        }
        
        await supabase.from("posts").insert({ 
            user_id: user?.id, content: newPost, media_urls: mediaUrls.length ? mediaUrls : null, 
            post_type: postType, voting_period_active: true, is_community_approved: true // Auto approve for demo
        });
        
        toast({ title: "Publicado com sucesso!" });
        setNewPost(""); setMediaFiles([]); setShowCreateModal(false); refetch();
      } catch (e: any) { toast({ variant: "destructive", title: "Erro", description: e.message }); } 
      finally { setUploading(false); }
    };

    return (
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-xl">
          <DialogHeader><DialogTitle>Novo Post</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 mb-4">
             <Button variant={postType === 'standard' ? "default" : "outline"} onClick={() => setPostType('standard')} className={postType === 'standard' ? "bg-blue-600" : "border-gray-600"}>
                <Globe className="mr-2 h-4 w-4"/> Padrão
             </Button>
             <Button variant={postType === 'viral_clips' ? "default" : "outline"} onClick={() => setPostType('viral_clips')} className={postType === 'viral_clips' ? "bg-pink-600" : "border-gray-600"}>
                <Film className="mr-2 h-4 w-4"/> Clip
             </Button>
          </div>
          <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Compartilhe algo..." className="w-full bg-gray-800 rounded-md p-3 min-h-[100px] text-white" />
          <div className="flex gap-2 mt-2">
             <input type="file" ref={galleryInputRef} multiple className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
             <Button variant="outline" size="sm" className="border-gray-600 text-gray-300" onClick={() => galleryInputRef.current?.click()}><Images className="mr-2 h-4 w-4"/> Mídia</Button>
             <span className="text-xs text-gray-500 self-center">{mediaFiles.length} arquivos</span>
          </div>
          <Button onClick={handleCreatePost} disabled={uploading} className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600">
             {uploading ? <Loader2 className="animate-spin" /> : "Publicar"}
          </Button>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div 
      className="fixed inset-0 overflow-hidden bg-black touch-none" 
      onTouchStart={handleTouchStart} 
      onTouchMove={handleTouchMove} 
      onTouchEnd={handleTouchEnd}
    >
      {/* Header Fixo */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <Sheet open={showMenu} onOpenChange={setShowMenu}>
             <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white"><Menu /></Button></SheetTrigger>
             <SheetContent side="left" className="bg-gray-900 border-gray-800 text-white">
                <SheetHeader><SheetTitle className="text-white">Menu</SheetTitle></SheetHeader>
                <div className="mt-4"><UserLink userId={user?.id} username="Perfil" className="font-bold"/></div>
             </SheetContent>
          </Sheet>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white drop-shadow-md">
              World<span className="text-blue-500">Flow</span>
            </h1>
            {currentFeedItem?.type === 'clip_container' && (
                <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest animate-pulse">Modo Clips</span>
            )}
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="icon" className="pointer-events-auto rounded-full bg-gradient-to-tr from-pink-500 to-orange-500 shadow-lg hover:scale-105 transition-transform"><Plus /></Button>
      </div>

      {/* Área Principal de Renderização */}
      <div className="w-full h-full pt-0">
        {renderContent()}
      </div>

      {/* Modais */}
      <CreatePostModal />
      
      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => !o && setOpeningCommentsFor(null)}>
        <DialogContent className="max-w-lg bg-gray-900 border-gray-800 text-white max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Comentários</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {loadingComments ? <Loader2 className="mx-auto animate-spin" /> : 
              comments?.length ? comments.map((c:any) => (
                <div key={c.id} className="flex gap-3 mb-4 p-2 rounded hover:bg-white/5">
                  <Avatar className="h-8 w-8"><AvatarImage src={c.author?.avatar_url}/><AvatarFallback>U</AvatarFallback></Avatar>
                  <div>
                    <span className="font-bold text-sm text-gray-200">{c.author?.username}</span>
                    <p className="text-sm text-white/90">{c.content}</p>
                  </div>
                </div>
              )) : <p className="text-center text-gray-500">Seja o primeiro a comentar!</p>
            }
          </ScrollArea>
          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-800">
            <Input value={newCommentText} onChange={e => setNewCommentText(e.target.value)} placeholder="Comente..." className="bg-gray-800 border-none text-white focus-visible:ring-blue-500"/>
            <Button size="icon" onClick={() => addComment.mutate()} disabled={addComment.isPending} className="bg-blue-600"><Send className="h-4 w-4"/></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}