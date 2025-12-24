import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send,
  Camera, Video, Images, Play,
  ChevronLeft, ChevronRight, Volume2, VolumeX,
  Clock, Loader2, Globe,
  Menu, ArrowDown, ArrowUp, ArrowLeft, ArrowRight,
  Film, Plus, Bomb, Timer,
  X, Camera as CameraIcon, Video as VideoIcon,
  Wand2, Sparkles, Info, Check, HelpCircle,
  MoveVertical, MoveHorizontal, Hand
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { MentionText } from "@/components/MentionText";
import { sendPushEvent } from "@/utils/pushClient";

/* ---------- CONFIGURAÇÕES DE ESTILO IA ---------- */
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

/* ---------- COMPONENTE DE TUTORIAL CORRIGIDO ---------- */
interface TutorialOverlayProps {
  isVisible: boolean;
  currentStep: number;
  onClose: () => void;
  onNext: () => void;
  currentFeedItem: any;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isVisible,
  currentStep,
  onClose,
  onNext,
  currentFeedItem
}) => {
  const [mounted, setMounted] = useState(false);

  // Efeito para controlar a montagem do componente
  useEffect(() => {
    if (isVisible) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const tutorialSteps = [
    {
      title: "🎉 Bem-vindo ao World Flow!",
      description: "Explore os posts mais votados da comunidade. Vamos te mostrar como navegar.",
      icon: <Globe className="w-6 h-6 text-white" />,
      showGesture: false,
      gestureType: null,
      position: 'center'
    },
    {
      title: "📱 Navegação Vertical",
      description: "Deslize para CIMA ou para BAIXO para navegar entre os posts.",
      icon: <MoveVertical className="w-6 h-6 text-white" />,
      showGesture: true,
      gestureType: 'vertical',
      position: 'top'
    },
    {
      title: "🎬 Acessando os Clips",
      description: "Deslize para a DIREITA a partir de qualquer post para acessar a seção de Clips!",
      icon: <Film className="w-6 h-6 text-white" />,
      showGesture: true,
      gestureType: 'right_swipe',
      position: 'center'
    },
    {
      title: "↔️ Navegando entre Clips",
      description: "Dentro da seção de Clips, deslize para ESQUERDA ou DIREITA para navegar entre os vídeos.",
      icon: <MoveHorizontal className="w-6 h-6 text-white" />,
      showGesture: true,
      gestureType: 'horizontal',
      position: 'center'
    },
    {
      title: "✨ Interações Rápidas",
      description: "Toque nos ícones para curtir, comentar e compartilhar posts.",
      icon: <Heart className="w-6 h-6 text-white" />,
      showGesture: true,
      gestureType: 'tap',
      position: 'bottom'
    },
    {
      title: "🚀 Tudo pronto!",
      description: "Agora você já sabe como navegar. Divirta-se explorando!",
      icon: <Check className="w-6 h-6 text-white" />,
      showGesture: false,
      gestureType: null,
      position: 'center'
    }
  ];

  if (!mounted || !isVisible) return null;

  const currentStepData = tutorialSteps[currentStep];

  const renderGesture = () => {
    if (!currentStepData.showGesture) return null;

    if (currentStepData.gestureType === 'vertical') {
      return (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="flex flex-col items-center gap-4">
              <ArrowUp className="w-10 h-10 text-blue-300 animate-bounce" />
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-white/80">Para cima</span>
                <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-white/80">Para baixo</span>
              </div>
              <ArrowDown className="w-10 h-10 text-blue-300 animate-bounce" />
            </div>
            <div className="text-center mt-4">
              <p className="text-xs text-blue-200 font-medium">Deslize verticalmente</p>
            </div>
          </div>
        </div>
      );
    }

    if (currentStepData.gestureType === 'right_swipe') {
      return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-pink-500/30 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500/10 to-transparent animate-pulse"></div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-xs text-pink-300 bg-pink-900/50 px-2 py-1 rounded-full">Post Normal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-r from-pink-600 to-purple-600 w-24 h-12 rounded-lg flex items-center justify-center">
                          <Film className="w-6 h-6 text-white" />
                          <span className="text-xs font-bold ml-2 text-white">Clips</span>
                        </div>
                        <span className="text-lg font-bold text-pink-300">←</span>
                        <ArrowLeft className="w-8 h-8 text-pink-400 animate-bounce" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-pink-200 font-medium mt-2">Deslize para a esquerda para acessar os Clips</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentStepData.gestureType === 'horizontal') {
      return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-8">
                <ArrowLeft className="w-10 h-10 text-pink-300 animate-bounce" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                  <p className="text-xs text-pink-200 font-medium">Deslize horizontalmente</p>
                </div>
                <ArrowRight className="w-10 h-10 text-pink-300 animate-bounce" />
              </div>
              <div className="text-center mt-4">
                <p className="text-xs text-pink-200 font-medium">Para navegar entre os Clips</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentStepData.gestureType === 'tap') {
      return (
        <div className="absolute bottom-32 right-8 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 animate-pulse">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Hand className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs text-green-200 font-medium">Toque aqui</p>
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-emerald-300"></div>
          </div>
        </div>
      );
    }

    return null;
  };

  const positionClasses = {
    top: "top-10 left-1/2 transform -translate-x-1/2",
    center: "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
    bottom: "bottom-24 left-1/2 transform -translate-x-1/2"
  };

  return (
    <>
      {/* Overlay de fundo */}
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm transition-opacity duration-300">
        
        {/* Card do tutorial */}
        <div className={cn(
          "absolute z-[101] bg-gradient-to-br from-gray-900/95 to-black/95 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-[90vw] backdrop-blur-sm transition-all duration-300",
          positionClasses[currentStepData.position as keyof typeof positionClasses]
        )}>
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              {currentStepData.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{currentStepData.title}</h3>
              <p className="text-white/80 text-sm">{currentStepData.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              {tutorialSteps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    idx === currentStep ? "w-6 bg-white" : "bg-white/30"
                  )}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
              >
                Pular
              </Button>
              
              <Button
                onClick={onNext}
                className={cn(
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xs",
                  currentStep === tutorialSteps.length - 1 && "from-green-600 to-emerald-600"
                )}
              >
                {currentStep === tutorialSteps.length - 1 ? (
                  <>
                    Começar
                    <Check className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Gestos */}
        {renderGesture()}

        {/* Dica específica para Clips */}
        {currentFeedItem?.type === 'clip_container' && (currentStep === 2 || currentStep === 3) && (
          <div className="absolute top-20 right-4 animate-pulse z-[101]">
            <div className="bg-gradient-to-r from-pink-900/90 to-purple-900/90 border border-pink-500/30 rounded-xl p-3 max-w-xs backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-pink-300" />
                <div>
                  <p className="font-bold text-white text-xs">💡 Você está nos Clips!</p>
                  <p className="text-white/80 text-xs">Deslize horizontalmente para navegar</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/* ---------- FUNÇÕES DE IA PARA IMAGENS ---------- */
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

/* ---------- COMPONENTE: VideoPlayer Udg (Clips) ---------- */
interface UdgVideoPlayerProps {
  src: string;
  post: any;
  user: any;
  onLike: () => void;
  onComment: () => void;
  hasPrevClip: boolean;
  hasNextClip: boolean;
  onNextClip: () => void;
  onPreviousClip: () => void;
  showTutorial?: boolean;
}

const UdgVideoPlayer = ({ 
  src, post, user, onLike, onComment, 
  hasPrevClip, hasNextClip,
  showTutorial = false
}: UdgVideoPlayerProps) => {
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
    const v = videoRef.current;
    if (!v) return;

    if (isPlaying) {
      // Avoid noisy AbortError logs when the element is unmounted/replaced during navigation/rerenders
      if (!(v as any).isConnected) return;
      v.play().catch((e: any) => {
        const name = e?.name;
        if (name === 'AbortError' || name === 'NotAllowedError') return;
        console.log('Interação necessária para play com som', e);
      });
    } else {
      v.pause();
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
          <MentionText text={post.content ?? ""} />
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
  const [aiEditing, setAiEditing] = useState<{
    open: boolean; 
    imageIndex: number; 
    selectedStyle: string | null; 
    loading: boolean;
  }>({
    open: false, 
    imageIndex: -1, 
    selectedStyle: null, 
    loading: false
  });
  
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

  /* --- Funções de IA para Imagens --- */
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

      // Salvar menções (@username) para este post
      try {
        if (newPostData?.id && user?.id) {
          const { saveMentions } = await import("@/utils/mentionsHelper");
          await saveMentions(newPostData.id, "post", newPost || "", user.id);
        }
      } catch (e) {
        console.warn('Falha ao salvar menções do post', e);
      }

      // Push: avisar seguidores/amigos sobre um novo post na Arena (respeita preferências)
      try {
        if (newPostData?.id) {
          void sendPushEvent({ eventType: 'post', postId: newPostData.id });
        }
      } catch (e) {
        console.warn('Falha ao disparar push de post', e);
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
    <>
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
            
            <MentionTextarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder={
                postType === 'viral_clips'
                  ? "Descreva seu Clip Viral... (use @ para mencionar)"
                  : "No que você está pensando? Use @ para mencionar alguém..."
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
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => setAiEditing({ 
                            open: true, 
                            imageIndex: 0, 
                            selectedStyle: null, 
                            loading: false 
                          })}
                        >
                          <Wand2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-600 hover:bg-red-700"
                          onClick={removeMedia}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
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

      {/* Dialog de Estilo IA */}
      <Dialog open={aiEditing.open} onOpenChange={o => setAiEditing(p => ({...p, open: o}))}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-400"/> 
              Estúdio Mágico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mediaFiles[aiEditing.imageIndex] && (
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center">
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
                        "flex items-center gap-3 p-3 rounded-xl border border-gray-700 text-left transition-all hover:bg-gray-800", 
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
              className="text-gray-400 hover:text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Handler para erros de extensão
  useEffect(() => {
    const handleExtensionError = (e: ErrorEvent) => {
      if (e.message?.includes?.('Could not establish connection') || 
          e.message?.includes?.('Receiving end does not exist')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (e.reason?.message?.includes?.('Could not establish connection')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', handleExtensionError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleExtensionError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Verifica se é a primeira visita do usuário
  useEffect(() => {
    if (!user) return;
    
    const hasSeenTutorial = localStorage.getItem('worldFlowTutorialSeen');
    
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
        setTutorialStep(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Salva quando o tutorial for concluído
  const handleTutorialComplete = () => {
    localStorage.setItem('worldFlowTutorialSeen', 'true');
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const handleNextTutorialStep = () => {
    if (tutorialStep < 5) {
      setTutorialStep(prev => prev + 1);
    } else {
      handleTutorialComplete();
    }
  };

  const skipTutorial = () => {
    handleTutorialComplete();
  };

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
  const { data: rawPosts, refetch: refetchFeed, isLoading: postsLoading } = useQuery({
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
    if (!isModalOpen && !showTutorial && verticalIndex < feedStructure.length - 1) {
      setVerticalIndex(prev => prev + 1);
    }
  }, [verticalIndex, feedStructure.length, isModalOpen, showTutorial]);

  const goUp = useCallback(() => {
    if (!isModalOpen && !showTutorial && verticalIndex > 0) {
      setVerticalIndex(prev => prev - 1);
    }
  }, [verticalIndex, isModalOpen, showTutorial]);

  /* --- LÓGICA CORRIGIDA PARA GESTOS HORIZONTAIS --- */
  const goRight = useCallback(() => {
    if (!isModalOpen && !showTutorial) {
      if (currentFeedItem?.type === 'clip_container') {
        // Dentro do container de clips, navega para o próximo clip
        if (horizontalClipIndex < currentFeedItem.items.length - 1) {
          setHorizontalClipIndex(prev => prev + 1);
        }
      } else {
        // Fora dos clips, deslizar para a DIREITA vai para os clips
        const clipContainerIndex = feedStructure.findIndex(item => item.type === 'clip_container');
        if (clipContainerIndex !== -1) {
          setVerticalIndex(clipContainerIndex);
          setHorizontalClipIndex(0); // Reseta para o primeiro clip
        }
      }
    }
  }, [currentFeedItem, horizontalClipIndex, isModalOpen, showTutorial, verticalIndex, feedStructure]);

  const goLeft = useCallback(() => {
    if (!isModalOpen && !showTutorial) {
      // O gesto para esquerda só funciona quando estiver nos Clips
      if (currentFeedItem?.type === 'clip_container') {
        // Dentro do container de clips, navega para o clip anterior
        if (horizontalClipIndex > 0) {
          setHorizontalClipIndex(prev => prev - 1);
        } else {
          // Se estiver no primeiro clip, volta para o post anterior
          const prevItemIndex = verticalIndex - 1;
          if (prevItemIndex >= 0) {
            setVerticalIndex(prevItemIndex);
          }
        }
      }
      // Se não estiver nos Clips, o gesto para esquerda não faz nada
    }
  }, [currentFeedItem, horizontalClipIndex, isModalOpen, showTutorial, verticalIndex]);

  /* --- Handlers de Input --- */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isModalOpen || showTutorial) return;
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isModalOpen || showTutorial) return;
    setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (isModalOpen || showTutorial || !touchStart || !touchEnd) return;
    const xDiff = touchStart.x - touchEnd.x;
    const yDiff = touchStart.y - touchEnd.y;
    const minSwipe = 50;

    /* --- LÓGICA CORRIGIDA --- */
    // Se o gesto for horizontal e significativo
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (Math.abs(xDiff) > minSwipe) {
        // xDiff > 0 significa swipe left (dedo foi da direita para a esquerda)
        // xDiff < 0 significa swipe right (dedo foi da esquerda para a direita)
        if (xDiff > 0) {
          goLeft(); // swipe left (para esquerda)
        } else {
          goRight(); // swipe right (para direita)
        }
      }
    } else {
      // Gestos verticais funcionam normalmente
      if (Math.abs(yDiff) > minSwipe) {
        if (yDiff > 0) goDown(); else goUp();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isModalOpen || showTutorial) return;
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
  }, [goDown, goUp, isModalOpen, isMobile, showTutorial]);

  /* --- Função para curtir posts --- */
  const handleLike = async (postId: string) => {
    if (isModalOpen || showTutorial) return;
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

        // Salvar menções (@username) para este comentário
        try {
          if (data?.id && user?.id) {
            const { saveMentions } = await import("@/utils/mentionsHelper");
            await saveMentions(data.id, "comment", newCommentText.trim(), user.id);
          }
        } catch (e) {
          console.warn('Falha ao salvar menções do comentário', e);
        }

        // Push: avisar o dono do post que recebeu um comentário (respeita preferências)
        try {
          if (data?.id) {
            void sendPushEvent({ eventType: 'comment', commentId: data.id });
          }
        } catch (e) {
          console.warn('Falha ao disparar push de comentário', e);
        }

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
    if (postsLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white p-4 sm:p-8 bg-gray-950">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-400">Carregando conteúdo...</p>
        </div>
      );
    }

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
        <div className="relative w-full h-full">
          <UdgVideoPlayer
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
            showTutorial={showTutorial && tutorialStep >= 2 && tutorialStep <= 3}
          />
        </div>
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
                <MentionText text={post.content ?? ""} />
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
      {/* Tutorial Overlay - CORRIGIDO */}
      <TutorialOverlay 
        isVisible={showTutorial}
        currentStep={tutorialStep}
        onClose={skipTutorial}
        onNext={handleNextTutorialStep}
        currentFeedItem={currentFeedItem}
      />

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
                {!localStorage.getItem('worldFlowTutorialSeen') && (
                  <Button 
                    variant="ghost" 
                    className="justify-start text-sm sm:text-base"
                    onClick={() => {
                      setShowTutorial(true);
                      setTutorialStep(0);
                    }}
                  >
                    <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Ver Tutorial Novamente
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="justify-self-center flex flex-col items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white">
            World <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Flow</span>
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

      {/* Conteúdo principal */}
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
      
      {/* Modal de comentárioss */}
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
                    <p className="text-xs sm:text-sm text-white/90"><MentionText text={c.content ?? ""} /></p>
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
              <MentionTextarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Escreva um comentário... (use @ para mencionar)"
                rows={1}
                className="bg-gray-800 border-gray-700 text-white rounded-full text-sm min-h-[36px] h-9 sm:h-10 py-2 px-4 resize-none"
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