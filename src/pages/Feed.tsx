import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send,
  Camera, Video, Images, Play,
  ChevronLeft, ChevronRight, Volume2, VolumeX,
  Clock, Loader2, Globe,
  Menu, ArrowDown,
  Film, Plus, Bomb, Timer,
  X, Camera as CameraIcon, Video as VideoIcon
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

/* ---------- FUNÇÕES DE COMPRESSÃO DE ARQUIVOS ---------- */
const compressImage = async (file: File, maxWidth = 1200, quality = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    if (file.size < 3 * 1024 * 1024) {
      resolve(file);
      return;
    }

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
          resolve(file); 
          return; 
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], `image_${Date.now()}.jpg`, { 
              type: 'image/jpeg', 
              lastModified: Date.now() 
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const processMediaFile = async (file: File): Promise<File> => {
  try {
    if (file.type.startsWith('image/')) {
      return await compressImage(file);
    }
    return file;
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
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
      
      {/* Botões de ação responsivos */}
      <div className="absolute right-2 sm:right-4 bottom-28 sm:bottom-32 flex flex-col items-center gap-4 sm:gap-6 z-20">
        <div className="flex flex-col items-center group">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all active:scale-90"
            onClick={onLike}
          >
            <Heart className={cn("h-5 w-5 sm:h-7 sm:w-7 transition-colors drop-shadow-md", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
          </Button>
          <span className="text-white text-xs font-bold drop-shadow-md mt-1">{post.likes?.length || 0}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all active:scale-90"
            onClick={onComment}
          >
            <MessageCircle className="h-5 w-5 sm:h-7 sm:w-7 drop-shadow-md" />
          </Button>
          <span className="text-white text-xs font-bold drop-shadow-md mt-1">{post.comments?.length || 0}</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all active:scale-90"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="h-4 w-4 sm:h-6 sm:w-6 drop-shadow-md" /> : <Volume2 className="h-4 w-4 sm:h-6 sm:w-6 drop-shadow-md" />}
        </Button>
      </div>

      {/* Informações do post responsivas */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-16 sm:pt-20">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-white/30 shadow-lg">
            <AvatarImage src={post.profiles?.avatar_url}/>
            <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-orange-500 font-bold text-xs sm:text-sm">
              {post.profiles?.username?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
             <UserLink 
              userId={post.user_id} 
              username={post.profiles?.username || ''}
              className="font-bold text-white text-sm sm:text-md drop-shadow-md hover:text-pink-300 transition-colors"
            >
              @{post.profiles?.username}
            </UserLink>
            <span className="text-xs text-white/70 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(post.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <p className="text-white/95 text-xs sm:text-sm mb-2 line-clamp-3 font-medium drop-shadow-md leading-relaxed pr-4">
            {post.content}
        </p>
      </div>
    </div>
  );
};

/* ---------- MODAL DE CRIAÇÃO SEPARADO ---------- */
interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ open, onOpenChange, user, onSuccess }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [postType, setPostType] = useState<'standard' | 'viral_clips'>('standard');
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedMediaTypes = () => {
    if (postType === 'viral_clips') {
      return {
        gallery: 'video/*',
        cameraPhoto: null,
        cameraVideo: 'video/*'
      };
    } else {
      return {
        gallery: 'image/*,video/*',
        cameraPhoto: 'image/*',
        cameraVideo: 'video/*'
      };
    }
  };

  const mediaTypes = getAcceptedMediaTypes();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    console.log(`Arquivo selecionado: ${file.name}, tipo: ${file.type}`);
    
    if (postType === 'viral_clips' && !file.type.startsWith('video/')) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo inválido",
        description: "Para Clips, apenas vídeos são permitidos."
      });
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 100MB"
      });
      return;
    }
    
    try {
      const processedFile = await processMediaFile(file);
      setMediaFiles([processedFile]);
      setShowMediaOptions(false);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar arquivo",
        description: "Não foi possível processar o arquivo selecionado"
      });
    }
  };

  const openCameraPhoto = () => {
    if (cameraPhotoInputRef.current) {
      cameraPhotoInputRef.current.click();
    }
  };

  const openCameraVideo = () => {
    if (cameraVideoInputRef.current) {
      cameraVideoInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const removeMedia = () => {
    setMediaFiles([]);
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
    
    try {
      const mediaUrls: string[] = [];
      
      if (mediaFiles.length > 0) {
        const file = mediaFiles[0];
        
        const fileExt = file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        console.log(`Fazendo upload para: ${filePath}`);
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
          throw new Error("Não foi possível obter URL pública do arquivo");
        }
        
        let prefixedUrl = '';
        if (file.type.startsWith("video/")) {
          prefixedUrl = `video::${urlData.publicUrl}`;
        } else if (file.type.startsWith("image/")) {
          prefixedUrl = `image::${urlData.publicUrl}`;
        } else {
          prefixedUrl = urlData.publicUrl;
        }
        
        mediaUrls.push(prefixedUrl);
      }
      
      const votingEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
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
      
      toast({ 
        title: "🎯 Post enviado para a Arena!",
        description: `Seu post ${postType === 'viral_clips' ? '(Clip)' : ''} tem 60 minutos para receber votos!`,
        duration: 5000 
      });
      
      setNewPost(""); 
      setMediaFiles([]); 
      onOpenChange(false);
      
      queryClient.invalidateQueries({ queryKey: ["arena-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      
      setTimeout(() => {
        navigate('/arena');
      }, 2000);
      
      onSuccess();
      
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
    }
  };

  const renderMediaOptions = () => {
    if (postType === 'viral_clips') {
      return (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 sm:h-14 flex-col gap-1 border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 text-xs sm:text-sm"
            onClick={openCameraVideo}
          >
            <VideoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs">Gravar Vídeo</span>
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="h-12 sm:h-14 flex-col gap-1 border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 text-xs sm:text-sm"
            onClick={openGallery}
          >
            <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs">Galeria de Vídeos</span>
          </Button>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 sm:h-14 flex-col gap-1 border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 text-xs sm:text-sm"
            onClick={openCameraPhoto}
          >
            <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs">Tirar Foto</span>
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="h-12 sm:h-14 flex-col gap-1 border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 text-xs sm:text-sm"
            onClick={openCameraVideo}
          >
            <VideoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs">Gravar Vídeo</span>
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="h-12 sm:h-14 flex-col gap-1 border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 col-span-2 text-xs sm:text-sm"
            onClick={openGallery}
          >
            <Images className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs">Galeria (Fotos e Vídeos)</span>
          </Button>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg w-[95vw] sm:w-[90vw] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl p-0">
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold">Criar Novo Post</span>
              <Badge className={cn(
                "text-xs",
                postType === 'viral_clips' 
                  ? "bg-gradient-to-r from-pink-500 to-purple-500" 
                  : "bg-gradient-to-r from-yellow-500 to-orange-500"
              )}>
                {postType === 'viral_clips' ? (
                  <Film className="h-3 w-3 mr-1" />
                ) : (
                  <Timer className="h-3 w-3 mr-1" />
                )}
                {postType === 'viral_clips' ? 'Clip' : '60min'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {postType === 'viral_clips' 
              ? "Crie um Clip Viral (apenas vídeos)" 
              : "Seu post será enviado para a Arena para votação"}
          </p>
        </div>
        
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Button 
              variant={postType === 'standard' ? "default" : "outline"} 
              onClick={() => {
                setPostType('standard');
                setMediaFiles([]);
              }} 
              className={cn("h-10 sm:h-12 text-xs sm:text-sm", postType === 'standard' ? "bg-blue-600 hover:bg-blue-700" : "border-gray-700")}
            >
              <Globe className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"/> Post Normal
            </Button>
            <Button 
              variant={postType === 'viral_clips' ? "default" : "outline"} 
              onClick={() => {
                setPostType('viral_clips');
                setMediaFiles([]);
              }} 
              className={cn("h-10 sm:h-12 text-xs sm:text-sm", postType === 'viral_clips' ? "bg-pink-600 hover:bg-pink-700" : "border-gray-700")}
            >
              <Film className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"/> Clip Viral
            </Button>
          </div>
          
          <textarea 
            value={newPost} 
            onChange={(e) => setNewPost(e.target.value)} 
            placeholder={
              postType === 'viral_clips' 
                ? "Descreva seu Clip Viral..." 
                : "No que você está pensando? Seu post será votado na Arena por 60 minutos..."
            } 
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[100px] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none text-sm sm:text-base" 
          />
          
          <input 
            type="file" 
            ref={galleryInputRef} 
            className="hidden" 
            accept={mediaTypes.gallery || ''}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <input 
            type="file" 
            ref={cameraPhotoInputRef} 
            className="hidden" 
            accept={mediaTypes.cameraPhoto || ''}
            capture="environment"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <input 
            type="file" 
            ref={cameraVideoInputRef} 
            className="hidden" 
            accept={mediaTypes.cameraVideo || ''}
            capture="environment"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          <div className="mt-3 sm:mt-4">
            {mediaFiles.length === 0 ? (
              <>
                {!showMediaOptions ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-2 border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 h-12 sm:h-14 text-sm sm:text-base"
                    onClick={() => setShowMediaOptions(true)}
                  >
                    <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {postType === 'viral_clips' ? 'Adicionar Vídeo' : 'Adicionar Mídia'}
                  </Button>
                ) : (
                  <div className="space-y-3 animate-in fade-in">
                    {renderMediaOptions()}
                    
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-gray-400 hover:text-white text-sm"
                      onClick={() => setShowMediaOptions(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-800/30">
                {mediaFiles[0].type.startsWith('image/') ? (
                  <>
                    <img 
                      src={URL.createObjectURL(mediaFiles[0])} 
                      alt="Preview" 
                      className="w-full h-40 sm:h-48 object-contain bg-black"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-600 hover:bg-red-700"
                      onClick={removeMedia}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <video 
                      src={URL.createObjectURL(mediaFiles[0])} 
                      controls
                      className="w-full h-40 sm:h-48 object-contain bg-black"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-600 hover:bg-red-700"
                      onClick={removeMedia}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </>
                )}
                <div className="p-2 bg-black/50 absolute bottom-0 left-0 right-0">
                  <p className="text-xs text-white truncate">
                    {mediaFiles[0].name} ({Math.round(mediaFiles[0].size / 1024 / 1024 * 100) / 100}MB)
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-full",
                postType === 'viral_clips' 
                  ? "bg-gradient-to-br from-pink-600 to-purple-600"
                  : "bg-gradient-to-br from-blue-600 to-purple-600"
              )}>
                {postType === 'viral_clips' ? (
                  <Film className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                ) : (
                  <Timer className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-blue-300 text-xs sm:text-sm">
                  {postType === 'viral_clips' ? 'Clip Viral' : 'Sistema de Votação'}
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-red-500/20 p-1 rounded-full">
                      <Heart className="h-3 w-3 text-red-400" />
                    </div>
                    <span className="text-xs">Coração = +1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-700/50 p-1 rounded-full">
                      <Bomb className="h-3 w-3 text-gray-400" />
                    </div>
                    <span className="text-xs">Bomba = -1</span>
                  </div>
                </div>
                <p className="text-xs text-blue-400/80 mt-2">
                  {postType === 'viral_clips' 
                    ? "🎬 Seu Clip Viral será votado por 60 minutos. Mais corações que bombas = clip aprovado!"
                    : "⏱️ 60 minutos de votação. Mais corações que bombas = post aprovado!"}
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleCreatePost} 
            disabled={uploading || (!newPost.trim() && mediaFiles.length === 0)} 
            className={cn(
              "w-full mt-3 sm:mt-4 h-10 sm:h-12 font-bold text-sm sm:text-md transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              postType === 'viral_clips' 
                ? "bg-gradient-to-r from-pink-600 to-purple-600 hover:shadow-pink-500/25" 
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/25"
            )}
          >
            {uploading ? (
              <div className="flex items-center">
                <Loader2 className="animate-spin mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Enviando...
              </div>
            ) : (
              <>
                <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                {postType === 'viral_clips' ? 'Enviar Clip para Votação' : 'Enviar para Votação'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta se é dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  /* Query para verificar posts na arena */
  const { data: arenaPosts } = useQuery({
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
    if (!isModalOpen && verticalIndex < feedStructure.length - 1) {
      setVerticalIndex(prev => prev + 1);
    }
  }, [verticalIndex, feedStructure.length, isModalOpen]);

  const goUp = useCallback(() => {
    if (!isModalOpen && verticalIndex > 0) {
      setVerticalIndex(prev => prev - 1);
    }
  }, [verticalIndex, isModalOpen]);

  const goRight = useCallback(() => {
    if (!isModalOpen && currentFeedItem?.type === 'clip_container') {
      if (horizontalClipIndex < currentFeedItem.items.length - 1) setHorizontalClipIndex(prev => prev + 1);
    }
  }, [currentFeedItem, horizontalClipIndex, isModalOpen]);

  const goLeft = useCallback(() => {
    if (!isModalOpen && currentFeedItem?.type === 'clip_container') {
      if (horizontalClipIndex > 0) setHorizontalClipIndex(prev => prev - 1);
    }
  }, [currentFeedItem, horizontalClipIndex, isModalOpen]);

  /* --- Handlers de Input --- */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isModalOpen) return;
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isModalOpen) return;
    setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (isModalOpen || !touchStart || !touchEnd) return;
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
      if (isModalOpen) return;
      if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) > 20) {
        if (e.deltaY > 0) goDown(); else goUp();
      }
    };
    
    // Apenas adiciona o evento wheel em desktop
    if (!isMobile) {
      window.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (!isMobile) {
        window.removeEventListener('wheel', handleWheel);
      }
    };
  }, [goDown, goUp, isModalOpen, isMobile]);

  /* --- Função para curtir posts --- */
  const handleLike = async (postId: string) => {
    if (isModalOpen) return;
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
        <div className="flex flex-col items-center justify-center h-full text-white p-4 sm:p-8 animate-in fade-in bg-gray-950">
          <Globe className="h-16 w-16 sm:h-24 sm:w-24 text-blue-600 mb-4 sm:mb-6 opacity-30 animate-pulse" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-center">Tudo calmo por aqui...</h2>
          <p className="text-gray-400 mt-2 text-center max-w-md text-sm sm:text-base">
            Os posts mais votados na Arena aparecerão aqui!
          </p>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="mt-4 sm:mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-blue-500/20"
          >
            Criar Novo Post
          </Button>
        </div>
      );
    }

    if (currentFeedItem.type === 'clip_container') {
      const clip = currentFeedItem.items[horizontalClipIndex];
      const mediaUrl = getMediaUrl(clip);
      if (!mediaUrl) return <div className="h-full flex items-center justify-center text-white bg-black p-4">Clip indisponível</div>;

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

    const post = currentFeedItem.data;
    const mediaUrl = getMediaUrl(post);
    const isVideo = mediaUrl && isVideoUrl(mediaUrl);
    const isLiked = post.likes?.some((l:any) => l.user_id === user?.id);

    return (
      <div className="h-full w-full relative bg-gray-900 overflow-hidden flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          {mediaUrl ? (
            <>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-3xl z-0" />
              <img src={mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl scale-110" alt="" />
              
              <div className="absolute inset-0 flex items-center justify-center z-10 pb-16 sm:pb-24 md:pb-0">
                {isVideo ? (
                  <video src={mediaUrl} className="w-full max-h-[70vh] sm:max-h-[80vh] md:max-h-full object-contain shadow-2xl" controls playsInline />
                ) : (
                  <img src={mediaUrl} alt="Post media" className="w-full max-h-[65vh] sm:max-h-[75vh] md:max-h-full object-contain shadow-2xl drop-shadow-2xl" />
                )}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950" />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-20 sm:pt-32 pb-4 sm:pb-8 px-3 sm:px-5">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-blue-500/50 shadow-lg">
              <AvatarImage src={post.profiles?.avatar_url}/>
              <AvatarFallback className="bg-blue-600 text-white font-bold text-sm sm:text-base">{post.profiles?.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <UserLink 
                userId={post.user_id} 
                username={post.profiles?.username||""} 
                className="font-bold text-white text-sm sm:text-lg hover:text-blue-400 drop-shadow-md truncate block"
              >
                @{post.profiles?.username}
              </UserLink>
              <div className="flex items-center gap-2 text-xs text-gray-300/80">
                <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                <Badge variant="outline" className="text-[10px] h-4 border-blue-500/30 text-blue-300 px-1 py-0 bg-blue-500/10">
                  {post.post_type === 'viral_clips' ? 'Clip' : 'Post'}
                </Badge>
              </div>
            </div>
          </div>

          {post.content && (
            <ScrollArea className="max-h-[25vh] sm:max-h-[30vh] w-full mb-3 sm:mb-4 pr-2">
              <p className="text-white/95 text-sm sm:text-base md:text-lg leading-relaxed font-medium drop-shadow-sm whitespace-pre-wrap">
                {post.content}
              </p>
            </ScrollArea>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                className={cn("rounded-full h-8 sm:h-10 px-3 sm:px-4 bg-white/10 backdrop-blur-md border border-white/5 text-xs sm:text-sm", 
                  isLiked ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-white")} 
                onClick={() => handleLike(post.id)}
              >
                <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2", isLiked && "fill-current")} />
                <span className="font-semibold">{post.likes?.length || 0}</span>
              </Button>

              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-full h-8 sm:h-10 px-3 sm:px-4 bg-white/10 backdrop-blur-md border border-white/5 text-white text-xs sm:text-sm"
                onClick={() => setOpeningCommentsFor(post)}
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="font-semibold">{post.comments?.length || 0}</span>
              </Button>
            </div>
            
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 bg-white/10 backdrop-blur-md text-white">
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    setIsModalOpen(showCreateModal || !!openingCommentsFor);
  }, [showCreateModal, openingCommentsFor]);

  return (
    <div 
      className="fixed inset-0 overflow-hidden bg-black touch-none font-sans"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header responsivo */}
      <div className="absolute top-0 left-0 right-0 z-40 p-3 sm:p-4 grid grid-cols-3 items-center bg-gradient-to-b from-black/90 via-black/40 to-transparent h-16 sm:h-20">
        <div className="justify-self-start">
          <Sheet open={showMenu} onOpenChange={setShowMenu}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-9 w-9 sm:h-10 sm:w-10">
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-gray-900 border-gray-800 text-white w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="text-white text-sm sm:text-base">Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:gap-4">
                <UserLink userId={user?.id} username="Meu Perfil" className="font-bold text-base sm:text-lg hover:text-blue-400"/>
                <Button 
                  variant="ghost" 
                  className="justify-start text-sm sm:text-base"
                  onClick={() => navigate('/arena')}
                >
                  <Timer className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Arena de Votação
                  {arenaPosts && arenaPosts.length > 0 && (
                    <Badge className="ml-2 bg-red-500 text-xs">{arenaPosts.length}</Badge>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="justify-self-center flex flex-col items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white">
            World<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Flow</span>
          </h1>
          {currentFeedItem?.type === 'clip_container' && (
            <span className="text-[8px] sm:text-[9px] text-pink-400 font-bold uppercase tracking-[0.2em] -mt-1">Clips</span>
          )}
        </div>

        <div className="justify-self-end">
          <Button 
            onClick={() => setShowCreateModal(true)} 
            size="icon" 
            className="rounded-full h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </Button>
        </div>
      </div>

      {/* cConteúdo principal */}
      <div className="w-full h-full pt-16 sm:pt-20 bg-black">
        {renderContent()}
      </div>

      {/* Modal de criação de post */}
      <CreatePostModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        user={user}
        onSuccess={() => refetchFeed()}
      />
      
      {/* Modal de comentários */}
      <Dialog open={!!openingCommentsFor} onOpenChange={(open) => !open && setOpeningCommentsFor(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white w-[95vw] sm:max-w-md max-h-[80vh] flex flex-col p-0">
          <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm sm:text-base">Comentários</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setOpeningCommentsFor(null)}
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-3 sm:p-4">
            {loadingComments ? (
              <div className="flex justify-center py-6 sm:py-8">
                <Loader2 className="animate-spin text-blue-500 h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            ) : comments?.length ? (
              comments.map((c:any) => (
                <div key={c.id} className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={c.profiles?.avatar_url}/>
                    <AvatarFallback className="text-xs bg-gray-700">U</AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-800/50 p-2 sm:p-3 rounded-lg flex-1">
                    <span className="font-bold text-xs text-gray-400 block mb-1">
                      {c.profiles?.username}
                    </span>
                    <p className="text-xs sm:text-sm text-white/90">{c.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 sm:py-10 opacity-50">
                <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 text-gray-500"/>
                <p className="text-xs sm:text-sm">Nenhum comentário ainda.</p>
              </div>
            )}
          </ScrollArea>
          
          <div className="p-2 sm:p-3 bg-gray-900 border-t border-gray-800">
            <div className="flex gap-2">
              <Input 
                value={newCommentText} 
                onChange={e => setNewCommentText(e.target.value)} 
                placeholder="Escreva um comentário..." 
                className="bg-gray-800 border-gray-700 text-white rounded-full text-sm h-9 sm:h-10"
              />
              <Button 
                size="icon" 
                onClick={() => addComment.mutate()} 
                disabled={addComment.isPending || !newCommentText.trim()} 
                className="rounded-full bg-blue-600 hover:bg-blue-500 h-9 w-9 sm:h-10 sm:w-10"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4"/>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}