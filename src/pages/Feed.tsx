import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, Bomb, X, Pencil, Trash2,
  Camera, Video, Maximize2, Minimize2, Images, RotateCcw, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Users, Sparkles, Wand2,
  Palette, Sun, Moon, Monitor, Zap, Skull, Film, Music, Baby, Brush, PenTool, Ghost, Smile,
  // NOVO: Adicionado Clock para o contador
  Clock 
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

/* ---------- Configurações de Estilo (Presets AGRESSIVOS) ---------- */
const AI_STYLES = [
  // Prompt muito mais agressivo para a API também
  { id: 'rejuvenate', label: 'Rejuvenescer', icon: Baby, color: 'bg-green-100 text-green-600', prompt: 'extreme makeover, 20 year old version, flawless baby skin, remove all wrinkles, face lift, glowing complexion, 8k resolution, photorealistic', filter: 'rejuvenate' },
  { id: 'oil', label: 'Pintura a Óleo', icon: Brush, color: 'bg-yellow-100 text-yellow-700', prompt: 'oil painting style, van gogh style, thick brushstrokes, artistic, masterpiece', filter: 'oil' },
  { id: 'cartoon', label: 'Cartoon 3D', icon: Smile, color: 'bg-blue-50 text-blue-500', prompt: '3d pixar style character, cute, big eyes, disney style, smooth render', filter: 'cartoon' },
  { id: 'sketch', label: 'Esboço', icon: PenTool, color: 'bg-stone-100 text-stone-600', prompt: 'pencil sketch, charcoal drawing, rough lines, black and white sketch', filter: 'sketch' },
  { id: 'fantasy', label: 'Fantasia', icon: Ghost, color: 'bg-indigo-100 text-indigo-600', prompt: 'fantasy art, magical atmosphere, glowing lights, ethereal, dreamlike', filter: 'fantasy' },
  { id: 'beauty', label: 'Embelezar', icon: Sparkles, color: 'bg-pink-100 text-pink-600', prompt: 'high quality, beautified, perfect lighting, 8k, smooth skin, makeup', filter: 'beauty' },
  { id: 'hdr', label: 'HDR / Nitidez', icon: Sun, color: 'bg-orange-100 text-orange-600', prompt: 'hdr, high contrast, sharp focus, detailed, hyperrealistic', filter: 'hdr' },
  { id: 'bw', label: 'Preto & Branco', icon: Moon, color: 'bg-gray-100 text-gray-600', prompt: 'black and white photography, artistic, monochrome, noir', filter: 'bw' },
  { id: 'vintage', label: 'Vintage 1950', icon: Film, color: 'bg-amber-100 text-amber-700', prompt: 'vintage photo, 1950s style, sepia, grain, old photo', filter: 'vintage' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, color: 'bg-purple-100 text-purple-600', prompt: 'cyberpunk style, neon lights, magenta and cyan, futuristic, scifi city', filter: 'cyberpunk' },
  { id: 'matrix', label: 'Matrix', icon: Monitor, color: 'bg-emerald-100 text-emerald-600', prompt: 'matrix code style, green tint, hacker atmosphere, digital rain', filter: 'matrix' },
  { id: 'anime', label: 'Anime', icon: Palette, color: 'bg-blue-100 text-blue-600', prompt: 'anime style, vibrant colors, 2d animation style, japanese animation', filter: 'anime' },
  { id: 'terror', label: 'Terror', icon: Skull, color: 'bg-red-100 text-red-600', prompt: 'horror style, dark atmosphere, scary, zombie apocalypse, blood', filter: 'terror' },
  { id: 'cold', label: 'Frio / Inverno', icon: Music, color: 'bg-cyan-100 text-cyan-600', prompt: 'cold atmosphere, winter, blue tones, ice, snow', filter: 'cold' },
];

/* ---------- Helpers de Mídia ---------- */
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

/* ---------- Types ---------- */
type PostRow = any;
type VoteUser = { id: string; username: string; avatar_url: string; vote_type: "heart" | "bomb" };

/* ---------- Hook de Contador Regressivo (NOVO) ---------- */
const useCountdown = (endTimeISO: string | undefined | null) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!endTimeISO) {
      setTimeLeft("");
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = new Date(endTimeISO).getTime() - now;

      if (difference <= 0) {
        setTimeLeft("Encerrada");
        return;
      }

      // Calcula horas, minutos e segundos
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const h = hours > 0 ? `${hours}h ` : '';
      const m = minutes.toString().padStart(2, '0');
      const s = seconds.toString().padStart(2, '0');

      // Formato: [Hh] MMm SSs
      setTimeLeft(`${h}${m}m ${s}s`);
    };

    calculateTimeLeft();
    // Atualiza a cada segundo
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endTimeISO]);

  return timeLeft;
};

/* ---------- Video Auto Player Hook (EXISTENTE) ---------- */
const useVideoAutoPlayer = () => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const playVideo = useCallback(async (videoId: string) => {
    const video = videoRefs.current.get(videoId);
    if (video && playingVideo !== videoId) {
      try {
        if (playingVideo) {
          const currentVideo = videoRefs.current.get(playingVideo);
          if (currentVideo) { currentVideo.pause(); currentVideo.currentTime = 0; }
        }
        setPlayingVideo(videoId);
        video.currentTime = 0;
        video.muted = muted;
        await video.play();
      } catch (error) { console.error('Error playing video:', error); }
    }
  }, [playingVideo, muted]);

  const pauseVideo = useCallback((videoId: string) => {
    if (playingVideo === videoId) {
      const video = videoRefs.current.get(videoId);
      if (video) { video.pause(); setPlayingVideo(null); }
    }
  }, [playingVideo]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
    if (playingVideo) {
      const video = videoRefs.current.get(playingVideo);
      if (video) video.muted = !muted;
    }
  }, [playingVideo, muted]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const videoId = entry.target.getAttribute('data-video-id');
          if (!videoId) return;
          if (entry.isIntersecting && entry.intersectionRatio > 0.8) { playVideo(videoId); }
          else if (playingVideo === videoId) { pauseVideo(videoId); }
        });
      },
      { threshold: [0, 0.8, 1], rootMargin: '0px 0px -10% 0px' }
    );
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [playVideo, pauseVideo, playingVideo]);

  const registerVideo = useCallback((videoId: string, videoElement: HTMLVideoElement) => {
    videoRefs.current.set(videoId, videoElement);
    if (observerRef.current) observerRef.current.observe(videoElement);
  }, []);

  const unregisterVideo = useCallback((videoId: string) => {
    const video = videoRefs.current.get(videoId);
    if (video && observerRef.current) observerRef.current.unobserve(video);
    videoRefs.current.delete(videoId);
  }, []);

  return { playingVideo, muted, playVideo, pauseVideo, toggleMute, registerVideo, unregisterVideo };
};

/* ---------- Audio Recording Hook (EXISTENTE) ---------- */
const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (event) => { audioChunks.current.push(event.data); };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => { if (prev >= 10) { stopRecording(); return 10; } return prev + 1; });
      }, 1000);
    } catch (error) { throw new Error('Microfone inacessível'); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => { setAudioBlob(null); setRecordingTime(0); };
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  return { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording };
};

/* ---------- Component Principal ---------- */
export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* States */
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [postType, setPostType] = useState<'standard' | 'photo_audio'>('standard');

  /* Hooks */
  const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const { playingVideo, muted, playVideo, pauseVideo, toggleMute, registerVideo, unregisterVideo } = useVideoAutoPlayer();

  /* AI Editing State */
  const [aiEditing, setAiEditing] = useState<{open: boolean; imageIndex: number; selectedStyle: string | null; loading: boolean}>({
    open: false, imageIndex: -1, selectedStyle: null, loading: false
  });

  /* Refs */
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);

  /* UI States */
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);
  const [voteUsersDialog, setVoteUsersDialog] = useState<{open: boolean; postId: string | null; voteType: "heart" | "bomb" | null}>({
    open: false, postId: null, voteType: null
  });

  /* Carousel States */
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /* Data Fetching */
  useEffect(() => {
    if (!user) return;
    const markAsViewed = async () => {
      await supabase.from("last_viewed").upsert(
        { user_id: user.id, section: "feed", viewed_at: new Date().toISOString() },
        { onConflict: "user_id,section" }
      );
      queryClient.invalidateQueries({ queryKey: ["unread-feed", user.id] });
    };
    markAsViewed();
  }, [user, queryClient]);

  const { data: posts, refetch } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`*, profiles:user_id (id, username, avatar_url, full_name), likes (id, user_id), comments (id), post_votes (id, user_id, vote_type)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PostRow[];
    },
    enabled: !!user,
  });

  const { data: voteUsers } = useQuery({
    queryKey: ["vote-users", voteUsersDialog.postId, voteUsersDialog.voteType],
    queryFn: async () => {
      if (!voteUsersDialog.postId || !voteUsersDialog.voteType) return [];
      const { data, error } = await supabase
        .from("post_votes")
        .select(`vote_type, profiles:user_id (id, username, avatar_url)`)
        .eq("post_id", voteUsersDialog.postId).eq("vote_type", voteUsersDialog.voteType);
      if (error) throw error;
      return data.map(v => ({ id: v.profiles.id, username: v.profiles.username, avatar_url: v.profiles.avatar_url, vote_type: v.vote_type })) as VoteUser[];
    },
    enabled: !!voteUsersDialog.postId && !!voteUsersDialog.voteType,
  });

  /* Realtime */
  useEffect(() => {
    const ch = supabase.channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_votes" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  /* Vote cron */
  useEffect(() => {
    const f = async () => { try { await supabase.functions.invoke("process-votes"); } catch {} };
    f();
    const i = setInterval(f, 60000);
    return () => clearInterval(i);
  }, []);

  /* Media Handling */
  const onFilesPicked = async (files?: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setProcessing(true);
    const accepted: File[] = [];
    for (const f of list) {
      try {
        if (f.type.startsWith("image/")) {
          const small = await compressImage(f, 1440, 0.8);
          accepted.push(small);
        } else if (f.type.startsWith("video/")) {
          const dur = await getMediaDurationSafe(f).catch(() => 0);
          if (dur === 0 || dur <= 15.3) accepted.push(f);
          else toast({ variant: "destructive", title: "Vídeo longo", description: "Máximo 15 segundos." });
        } else if (f.type.startsWith("audio/")) {
          const dur = await getMediaDurationSafe(f).catch(() => 0);
          if (dur === 0 || dur <= 10.3) accepted.push(f);
          else toast({ variant: "destructive", title: "Áudio longo", description: "Máximo 10 segundos." });
        } else {
          toast({ variant: "destructive", title: "Arquivo inválido", description: "Apenas imagem, vídeo ou áudio." });
        }
      } catch (err) {
        console.error("Erro ao processar arquivo:", err);
        toast({ variant: "destructive", title: "Erro ao processar mídia", description: "Tente novamente." });
      }
    }
    setProcessing(false);
    if (accepted.length) setMediaFiles(prev => [...prev, ...accepted]);
  };

  const removeFile = (idx: number) => {
    if (aiEditing.imageIndex === idx) {
      setAiEditing({open: false, imageIndex: -1, selectedStyle: null, loading: false});
    }
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const triggerGalleryInput = () => galleryInputRef.current?.click();
  const triggerCameraPhotoInput = () => cameraPhotoInputRef.current?.click();
  const triggerCameraVideoInput = () => cameraVideoInputRef.current?.click();

  /* Audio Recording */
  const handleStartRecording = async () => {
    try {
      await startRecording();
      toast({ title: "Gravando áudio...", description: "Clique em parar ou aguarde 10 segundos." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao gravar áudio", description: error.message });
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast({ title: "Áudio gravado!", description: "Áudio pronto para ser enviado." });
  };

  /* AI Editing */
  const applyAIEffects = (base64Image: string, filterType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const { canvas, ctx } = createCanvasToFit(img, 1440);
        
        // Cópia para efeitos
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d")!;
        tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Limpa o canvas principal
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (filterType === 'rejuvenate') {
          // 1. Desfoque Seletivo (Rejuvenescimento/Alisamento de Pele)
          ctx.filter = 'blur(6px)';
          ctx.drawImage(tempCanvas, 0, 0); // Desenha a imagem na tela com blur
          
          // Misturar original (para manter olhos/boca) com o desfoque (pele lisa)
          ctx.filter = 'none';
          ctx.globalAlpha = 0.6; // 60% original, 40% blur
          ctx.drawImage(tempCanvas, 0, 0); 
          
          // 2. Iluminação de Estúdio (Screen) - Remove sombras duras (rugas)
          ctx.globalCompositeOperation = 'screen';
          ctx.filter = 'brightness(1.1) contrast(1.1)';
          ctx.drawImage(tempCanvas, 0, 0); 
          
          // 3. Tom de Pele Jovem (Pêssego/Rosado)
          ctx.globalCompositeOperation = 'soft-light';
          ctx.fillStyle = '#ffc0cb'; // Pink suave
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // 4. Acabamento Final
          ctx.globalCompositeOperation = 'source-over';
          ctx.filter = 'saturate(1.1)'; // Devolver vida
          ctx.drawImage(canvas, 0, 0);
          
        } else if (filterType === 'oil') {
          ctx.filter = 'saturate(1.8) contrast(1.2) brightness(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'color-burn';
          ctx.filter = 'blur(2px)';
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = 'soft-light';
          ctx.filter = 'blur(0.5px)';
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (filterType === 'cartoon') {
          ctx.filter = 'contrast(1.2) saturate(1.2)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'overlay';
          ctx.filter = 'brightness(1.5)';
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (filterType === 'sketch') {
          ctx.filter = 'grayscale(1) invert(1) blur(1px)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'color-dodge';
          ctx.filter = 'invert(1)';
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (filterType === 'fantasy') {
          ctx.filter = 'saturate(1.5) contrast(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(173, 216, 230, 0.3)'; // light blue glow
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (filterType === 'beauty') {
          ctx.filter = 'brightness(1.1) contrast(1.05) saturate(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'soft-light';
          ctx.filter = 'blur(0.5px)';
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (filterType === 'hdr') {
          ctx.filter = 'contrast(1.5) saturate(1.5)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'overlay';
          ctx.filter = 'brightness(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (filterType === 'bw') {
          ctx.filter = 'grayscale(1) contrast(1.2)';
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (filterType === 'vintage') {
          ctx.filter = 'sepia(1) contrast(0.9) brightness(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(255, 200, 100, 0.1)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (filterType === 'cyberpunk') {
          ctx.filter = 'saturate(2) contrast(1.2) brightness(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'magenta';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'cyan';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (filterType === 'matrix') {
          ctx.filter = 'grayscale(1) contrast(1.5) brightness(0.8)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'hue';
          ctx.fillStyle = 'green';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (filterType === 'anime') {
          ctx.filter = 'saturate(1.5) contrast(1.1) brightness(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'soft-light';
          ctx.filter = 'blur(0.2px)';
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (filterType === 'terror') {
          ctx.filter = 'contrast(1.5) brightness(0.5) grayscale(0.5)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'color-burn';
          ctx.fillStyle = 'rgba(100, 0, 0, 0.3)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (filterType === 'cold') {
          ctx.filter = 'saturate(0.8) brightness(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalCompositeOperation = 'soft-light';
          ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Reset e Marca d'água
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
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
      const imageFile = mediaFiles[aiEditing.imageIndex];
      const base64 = await readFileAsDataURL(imageFile);
      const newBase64 = await applyAIEffects(base64, selectedStyle.filter);

      const blob = await fetch(newBase64).then(res => res.blob());
      const newFile = new File([blob], imageFile.name, { type: 'image/jpeg' });
      
      setMediaFiles(prev => prev.map((f, i) => i === aiEditing.imageIndex ? newFile : f));
      toast({ title: "Filtro IA Aplicado!", description: "A imagem foi transformada." });
      setAiEditing(prev => ({...prev, loading: false}));

    } catch (error) {
      console.error("Erro ao aplicar estilo IA:", error);
      toast({ variant: "destructive", title: "Erro IA", description: "Não foi possível aplicar o estilo." });
      setAiEditing(prev => ({...prev, loading: false}));
    }
  };

  /* Create Post */
  const handleCreatePost = async () => {
    if (postType === 'photo_audio' && (!audioBlob || mediaFiles.length === 0)) {
      toast({ variant: "destructive", title: "Erro", description: "Para postagem com áudio, é necessário uma foto e um áudio." });
      return;
    }
    if (postType === 'standard' && !newPost.trim() && mediaFiles.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Adicione conteúdo ou mídia." });
      return;
    }
    
    setUploading(true);
    try {
      const mediaUrls: string[] = [];
      let audioUrl: string | null = null;

      for (const file of mediaFiles) {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || (file.type.startsWith("video/") ? "mp4" : "jpg");
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(fileName, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName);
        mediaUrls.push((file.type.startsWith("video/") ? MEDIA_PREFIX.video : MEDIA_PREFIX.image) + publicUrl);
      }

      if (audioBlob) {
        const audioFileName = `${user?.id}-${Date.now()}-audio.wav`;
        const { error: audioUploadError } = await supabase.storage.from("media").upload(audioFileName, audioBlob, { contentType: 'audio/wav' });
        if (audioUploadError) throw audioUploadError;
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(audioFileName);
        audioUrl = MEDIA_PREFIX.audio + publicUrl;
      }

      // Votação: expira em 60 minutos (1 hora)
      const votingEndsAt = new Date();
      votingEndsAt.setHours(votingEndsAt.getHours() + 1); 

      const content = postType === 'photo_audio' ? '' : newPost;
      
      const { data: postData, error } = await supabase.from("posts").insert({
        user_id: user?.id,
        content: content,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        audio_url: audioUrl,
        post_type: postType,
        is_community_approved: false,
        voting_period_active: true, // Começa sempre ativo para votação
        voting_ends_at: votingEndsAt.toISOString(), // Expira em 1 hora
      }).select().single();

      if (error) throw error;

      setNewPost("");
      setMediaFiles([]);
      resetRecording();
      setPostType('standard');
      toast({ title: "Post enviado para aprovação!", description: "Seu post está em votação pela comunidade por 60 minutos." });
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });

    } catch (error) {
      console.error("Error creating post:", error);
      toast({ variant: "destructive", title: "Erro ao criar post" });
    } finally {
      setUploading(false);
    }
  };

  /* Carousel Logic */
  const photoAudioPosts = posts?.filter((x: PostRow) => x.post_type === 'photo_audio') || [];

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
    if (carouselRef.current) {
        setCurrentTranslate(carouselRef.current.scrollLeft);
    }
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const dragDistance = clientX - startX;
    carouselRef.current.scrollLeft = currentTranslate - dragDistance;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (!carouselRef.current) return;

    const scroll = carouselRef.current.scrollLeft;
    const itemWidth = carouselRef.current.offsetWidth;
    // Determinar o próximo índice, forçando a "ancoragem"
    const nextIndex = Math.round(scroll / itemWidth);
    
    // Animar o scroll para a posição correta
    carouselRef.current.scrollTo({
        left: nextIndex * itemWidth,
        behavior: 'smooth',
    });
    
    setCurrentCarouselIndex(nextIndex);
  };

  const nextCarouselItem = () => {
    if (photoAudioPosts.length === 0) return;
    const nextIndex = (currentCarouselIndex + 1) % photoAudioPosts.length;
    setCurrentCarouselIndex(nextIndex);
    if (carouselRef.current) {
        carouselRef.current.scrollTo({
            left: nextIndex * carouselRef.current.offsetWidth,
            behavior: 'smooth',
        });
    }
  };

  const prevCarouselItem = () => {
    if (photoAudioPosts.length === 0) return;
    const prevIndex = (currentCarouselIndex - 1 + photoAudioPosts.length) % photoAudioPosts.length;
    setCurrentCarouselIndex(prevIndex);
    if (carouselRef.current) {
        carouselRef.current.scrollTo({
            left: prevIndex * carouselRef.current.offsetWidth,
            behavior: 'smooth',
        });
    }
  };

  const handlePhotoAudioPlay = (audioUrl: string, postId: string) => {
    if (playingAudio === audioUrl) {
      currentAudioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const audio = new Audio(stripPrefix(audioUrl));
    currentAudioRef.current = audio;

    audio.onended = () => {
      setPlayingAudio(null);
      // Avança para o próximo item do carrossel após o áudio terminar
      const currentPost = photoAudioPosts.find(p => p.audio_url === audioUrl);
      if (currentPost && currentPost.id === postId) {
        nextCarouselItem();
      }
    };
    audio.play();
    setPlayingAudio(audioUrl);
  };

  /* Vote/Like/Comments/Edit/Delete */
  const handleVote = async (postId: string, voteType: "heart" | "bomb") => {
    try {
      const existing = posts?.find((p: any) => p.id === postId)?.post_votes?.find((v: any) => v.user_id === user?.id);
      if (existing) {
        if (existing.vote_type === voteType) {
          const { error } = await supabase.from("post_votes").delete().match({ post_id: postId, user_id: user?.id });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("post_votes").update({ vote_type }).match({ post_id: postId, user_id: user?.id });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("post_votes").insert({ post_id: postId, user_id: user?.id, vote_type });
        if (error) throw error;
      }
      refetch();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao votar", description: e?.message ?? "Tente novamente." });
    }
  };

  const handleShowVoteUsers = (postId: string, voteType: "heart" | "bomb") => {
    setVoteUsersDialog({ open: true, postId, voteType });
  };

  const handleLike = async (postId: string) => {
    try {
      const hasLiked = posts?.find((p: any) => p.id === postId)?.likes?.some((l: any) => l.user_id === user?.id);
      if (hasLiked) await supabase.from("likes").delete().match({ post_id: postId, user_id: user?.id });
      else await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
      refetch();
    } catch {}
  };

  const openEdit = (post: PostRow) => {
    setEditingPost(post);
    setEditContent(post.content || "");
  };

  const { data: openPostComments, refetch: refetchComments, isLoading: loadingComments } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id],
    enabled: !!openingCommentsFor?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("comments").select(`id, post_id, user_id, content, created_at, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)`).eq("post_id", openingCommentsFor!.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!openingCommentsFor?.id || !user || !newCommentText.trim()) return;
      await supabase.from("comments").insert({ post_id: openingCommentsFor.id, user_id: user.id, content: newCommentText.trim() });
    },
    onSuccess: async () => {
      setNewCommentText("");
      await Promise.all([refetchComments(), queryClient.invalidateQueries({ queryKey: ["posts", user?.id] })]);
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao comentar" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingPost) return;
      await supabase.from("posts").update({ content: editContent, updated_at: new Date().toISOString() }).eq("id", editingPost.id);
    },
    onSuccess: () => {
      setEditingPost(null);
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });
      toast({ title: "Post atualizado!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao atualizar" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const tasks = [
        supabase.from("comments").delete().eq("post_id", postId),
        supabase.from("likes").delete().eq("post_id", postId),
        supabase.from("post_votes").delete().eq("post_id", postId),
      ];
      for (const t of tasks) { const { error } = await t; if (error) throw error; }
      const { error: delPostError } = await supabase.from("posts").delete().eq("id", postId);
      if (delPostError) throw delPostError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });
      toast({ title: "Post excluído!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao excluir" }),
  });

  /* Carousel Renderer */
  const renderPhotoAudioCarousel = () => {
    const p = photoAudioPosts;
    if (!p.length) return null;

    const curr = p[currentCarouselIndex];
    const img = curr?.media_urls?.[0] ? stripPrefix(curr.media_urls[0]) : null;
    const aud = curr?.audio_url;
    const isPlaying = playingAudio === aud;

    return (
      <Card className="mb-6 border-0 shadow-2xl bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm overflow-hidden max-w-sm mx-auto">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-primary to-secondary p-2 rounded-xl shadow-lg"><Volume2 className="h-4 w-4 text-white" /></div>
              <div><h3 className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Flash</h3><p className="text-xs text-muted-foreground">Toque no áudio</p></div>
            </div>
            <div className="flex items-center gap-2 bg-background/80 rounded-full px-3 py-1.5 shadow-sm"><span className="text-sm font-semibold text-primary">{currentCarouselIndex + 1}</span><span className="text-sm text-muted-foreground">/</span><span className="text-xs text-muted-foreground">{p.length}</span></div>
          </div>
          
          <div className="relative w-full aspect-square"
            ref={carouselRef}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            style={{ overflowX: 'scroll', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', whiteSpace: 'nowrap' }}
          >
            {p.map((post, index) => (
              <div
                key={post.id}
                className="inline-block w-full h-full"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="p-4 h-full flex flex-col justify-center items-center">
                  <div className="relative rounded-xl overflow-hidden shadow-2xl border border-primary/20 w-full max-w-xs aspect-square">
                    {img && (
                      <img src={img} alt="Flash image" className="w-full h-full object-cover" />
                    )}
                    <Button onClick={() => handlePhotoAudioPlay(aud, post.id)} 
                      className={cn(
                        "absolute bottom-4 right-4 rounded-full shadow-lg transition-all duration-300",
                        isPlaying ? "bg-primary text-primary-foreground scale-110" : "bg-white/90 text-foreground hover:bg-white"
                      )} size="icon" > 
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>
                  {isPlaying && (
                    <div className="text-center mt-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s`, animationDuration: '0.6s' }} />
                          ))}
                        </div>
                        <span className="text-sm text-primary">Reproduzindo áudio...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button variant="ghost" size="icon" onClick={prevCarouselItem} className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-white/70 backdrop-blur-sm rounded-full shadow-md hover:bg-white"><ChevronLeft className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={nextCarouselItem} className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-white/70 backdrop-blur-sm rounded-full shadow-md hover:bg-white"><ChevronRight className="h-5 w-5" /></Button>

        </CardContent>
      </Card>
    );
  };

  /* UI */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* Logo Centralizada */}
        <div className="flex justify-center">
          <img src="https://sistemaapp.netlify.app/assets/logo-full.svg" alt="Logo" className="h-8 md:h-10" />
        </div>

        {/* Post Composer */}
        <Card className="shadow-2xl bg-gradient-to-br from-card to-card/90 backdrop-blur-sm border-none p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/30 shadow-md">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
            </Avatar>
            <MentionTextarea 
              value={newPost}
              onChange={(e) => {
                setNewPost(e.target.value);
                setPostType('standard'); // Volta para standard se começar a digitar
              }}
              placeholder="O que está na sua mente, amigo(a)? (Posts vão para aprovação da comunidade)"
              rows={postType === 'photo_audio' ? 1 : 3}
              className="flex-1 min-h-[5rem] rounded-xl border-primary/20 focus-visible:ring-primary/50"
              disabled={postType === 'photo_audio'} // Desabilita se for post de áudio
            />
          </div>

          {/* Opções de Postagem */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setPostType(postType === 'standard' ? 'photo_audio' : 'standard')} variant={postType === 'photo_audio' ? "default" : "outline"} className="rounded-xl transition-all duration-300 shadow-md">
                <Music className="h-4 w-4 mr-2" /> Flash + Áudio
              </Button>
              <Button onClick={triggerGalleryInput} variant="outline" size="sm" className="rounded-xl shadow-sm">
                <Images className="h-4 w-4 mr-2" /> Galeria
              </Button>
              <Button onClick={triggerCameraPhotoInput} variant="outline" size="sm" className="rounded-xl shadow-sm">
                <Camera className="h-4 w-4 mr-2" /> Foto
              </Button>
              <Button onClick={triggerCameraVideoInput} variant="outline" size="sm" className="rounded-xl shadow-sm">
                <Video className="h-4 w-4 mr-2" /> Vídeo (15s)
              </Button>
            </div>
            <Button onClick={handleCreatePost} disabled={uploading || processing || (postType === 'standard' && !newPost.trim() && mediaFiles.length === 0) || (postType === 'photo_audio' && (!audioBlob || mediaFiles.length === 0))} className="rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-xl transition-all duration-300">
              {uploading || processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {uploading ? "Enviando..." : processing ? "Processando..." : "Postar"}
            </Button>
          </div>

          {/* Input de Arquivos Nativos (Escondidos) */}
          <input type="file" ref={galleryInputRef} onChange={(e) => onFilesPicked(e.target.files)} className="hidden" accept="image/*,video/*,audio/*" multiple />
          <input type="file" ref={cameraPhotoInputRef} onChange={(e) => onFilesPicked(e.target.files)} className="hidden" accept="image/*" capture="camera" />
          <input type="file" ref={cameraVideoInputRef} onChange={(e) => onFilesPicked(e.target.files)} className="hidden" accept="video/*" capture="camcorder" />

          {/* Mídia Flash + Áudio */}
          {postType === 'photo_audio' && (
            <div className="flex items-center justify-between gap-4 p-3 border rounded-xl bg-primary/5">
              <p className="text-sm font-semibold text-primary">Flash + Áudio (10s)</p>
              <div className="space-y-3">
                {!audioBlob ? (
                  <Button onClick={isRecording ? handleStopRecording : handleStartRecording} variant={isRecording ? "destructive" : "outline"} className={cn("rounded-xl", isRecording && "animate-pulse")} size="lg">
                    {isRecording ? <><Square className="h-4 w-4 mr-2" /> Parar ({10 - recordingTime}s)</> : <><Mic className="h-4 w-4 mr-2" /> Gravar</>}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 justify-center">
                    <Volume2 className="h-4 w-4 text-green-500" /><span className="text-sm text-green-600">Gravado!</span>
                    <Button onClick={resetRecording} variant="outline" size="sm" className="rounded-xl">Regravar</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Previews de Mídia */}
          {mediaFiles.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {mediaFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shadow-lg flex items-center justify-center">
                    {file.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                    ) : file.type.startsWith("video/") ? (
                      <div className="relative w-full h-full">
                        <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted playsInline />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="bg-black/50 rounded-full p-1.5 shadow-lg"><Play className="h-4 w-4 text-white fill-white" /></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center"><Music className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  
                  {file.type.startsWith("image/") && (
                    <Button variant="secondary" size="icon" className="absolute -bottom-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300 shadow-md bg-purple-500 hover:bg-purple-600 text-white" onClick={() => setAiEditing({open: true, imageIndex: index, selectedStyle: null, loading: false})} title="Abrir Estúdio IA"><Wand2 className="h-3 w-3" /></Button>
                  )}
                  
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300 shadow-lg" onClick={() => removeFile(index)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Carrossel Photo Audio */}
        {renderPhotoAudioCarousel()}

        {/* Feed de Posts */}
        <div className="space-y-6">
          {posts?.map((post) => {
            const isOwnPost = post.user_id === user?.id;
            const hasLiked = post.likes?.some((l: any) => l.user_id === user?.id);
            const likesCount = post.likes?.length || 0;
            const commentsCount = post.comments?.length || 0;
            const heartVotes = post.post_votes?.filter((v: any) => v.vote_type === "heart").length || 0;
            const bombVotes = post.post_votes?.filter((v: any) => v.vote_type === "bomb").length || 0;
            const userVote = post.post_votes?.find((v: any) => v.user_id === user?.id);
            const isVotingActive = post.voting_period_active && post.voting_ends_at;
            const mediaList: string[] = post.media_urls || [];
            const isPhotoAudio = post.post_type === 'photo_audio';

            // Pular postagens photo_audio no feed normal (já estão no carrossel)
            if (isPhotoAudio) return null;

            // NOVO: Chamada ao hook de contagem regressiva
            const countdown = useCountdown(isVotingActive ? post.voting_ends_at : null); 
            const isVotingActiveAndRunning = isVotingActive && countdown !== "Encerrada";
            
            return (
              <Card key={post.id} className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-card to-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-500",
                post.is_community_approved && "ring-1 ring-primary/30 shadow-primary/10"
              )}>
                <CardContent className="pt-6 space-y-4">
                  
                  {/* Header do Post */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="ring-2 ring-primary/20 shadow-sm">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <UserLink userId={post.profiles?.id} username={post.profiles?.username} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                          {post.profiles?.full_name || post.profiles?.username}
                        </UserLink>
                        <p className="text-xs text-muted-foreground">{fmtDateTime(post.created_at)}</p>
                      </div>
                    </div>
                    {isOwnPost && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(post)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(post.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Votação / Aprovação */}
                  {post.is_community_approved && <Badge className="mb-2 bg-green-500/20 text-green-600 hover:bg-green-500/30">✓ Aprovado pela Comunidade</Badge>}
                  
                  {isVotingActive && (
                    <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-4 space-y-3 shadow-inner border border-border/20">
                      <div className="flex items-center justify-between text-sm">
                        
                        {/* NOVO: Bloco de Status e Contador */}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {post.is_community_approved ? "Post Aprovado" : post.voting_period_active ? "Aguardando aprovação da comunidade" : "Votação encerrada"}
                          </span>
                          
                          {(countdown && isVotingActiveAndRunning) && (
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 font-bold" variant="outline">
                              <Clock className="h-3 w-3 mr-1"/>
                              {countdown}
                            </Badge>
                          )}
                          
                          {countdown === "Encerrada" && !post.is_community_approved && (
                            <Badge className="bg-red-500/20 text-red-600 hover:bg-red-500/30 font-bold" variant="outline">
                              Votação Encerrada
                            </Badge>
                          )}
                        </div>
                        {/* FIM NOVO */}

                        <div className="flex gap-3 text-xs">
                          <Button onClick={() => handleShowVoteUsers(post.id, "heart")} className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full shadow-sm hover:bg-red-100" variant="ghost" size="sm"><Heart className="h-3 w-3 text-red-500 fill-red-500"/> {heartVotes}</Button>
                          <Button onClick={() => handleShowVoteUsers(post.id, "bomb")} className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full shadow-sm hover:bg-orange-100" variant="ghost" size="sm"><Bomb className="h-3 w-3 text-orange-500 fill-orange-500"/> {bombVotes}</Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleVote(post.id, "heart")}
                          variant={userVote?.vote_type === "heart" ? "default" : "outline"}
                          className={cn("flex-1 rounded-xl transition-all duration-300", userVote?.vote_type === "heart" ? "bg-red-500 hover:bg-red-600 shadow-md" : "hover:bg-red-50/50")}
                          disabled={!post.voting_period_active}
                        >
                          <Heart className="h-4 w-4 mr-2" /> Aprovar
                        </Button>
                        <Button
                          onClick={() => handleVote(post.id, "bomb")}
                          variant={userVote?.vote_type === "bomb" ? "default" : "outline"}
                          className={cn("flex-1 rounded-xl transition-all duration-300", userVote?.vote_type === "bomb" ? "bg-orange-500 hover:bg-orange-600 shadow-md" : "hover:bg-orange-50/50")}
                          disabled={!post.voting_period_active}
                        >
                          <Bomb className="h-4 w-4 mr-2" /> Reprovar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Conteúdo do Post */}
                  {post.content && <p className="text-foreground leading-relaxed whitespace-pre-wrap"><MentionText text={post.content ?? ""} /></p>}

                  {/* Mídia do Post */}
                  {mediaList.length > 0 && (
                    <div className={cn("grid gap-3 mt-3", mediaList.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                      {mediaList.map((raw: string, index: number) => {
                        const url = stripPrefix(raw);
                        const isVideo = isVideoUrl(raw);
                        const videoId = `${post.id}-${index}`;
                        
                        return (
                          <div key={index} className="rounded-xl overflow-hidden group relative bg-muted shadow-lg">
                            {isVideo ? (
                              <div className="relative w-full aspect-square">
                                <video 
                                  ref={(el) => { if (el) { registerVideo(videoId, el); } else { unregisterVideo(videoId); } }} 
                                  data-video-id={videoId}
                                  src={url} 
                                  className="w-full h-full object-cover" 
                                  loop 
                                  playsInline 
                                  preload="metadata"
                                  muted={muted}
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300" style={{ opacity: playingVideo === videoId ? 0 : 1 }}>
                                    <div className="bg-black/70 rounded-full p-2.5 shadow-xl">
                                        <Play className="h-6 w-6 text-white fill-white" />
                                    </div>
                                </div>
                                <Button onClick={toggleMute} variant="secondary" size="icon" className="absolute top-2 left-2 z-10 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white shadow-md"><span className="sr-only">Toggle Mute</span>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
                              </div>
                            ) : (
                              <img src={url} alt={`Post media ${index}`} className="w-full h-full object-cover aspect-square" />
                            )}
                            <button onClick={() => { setViewerUrl(url); setViewerIsVideo(isVideo); setViewerOpen(true); }} className="absolute inset-0">
                                <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-lg flex items-center gap-1">
                                    <Maximize2 className="h-3 w-3" /> Expandir
                                </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Ações e Contadores */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-4">
                      <Button onClick={() => handleLike(post.id)} variant="ghost" size="sm" className={cn("flex items-center gap-1 transition-colors", hasLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground")}>
                        <Heart className={cn("h-5 w-5", hasLiked && "fill-red-500")} /> {likesCount}
                      </Button>
                      <Button onClick={() => setOpeningCommentsFor(post)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <MessageCircle className="h-5 w-5" /> {commentsCount}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Bookmark className="h-5 w-5" />
                    </Button>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Visualizador de Mídia (Modal) */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 rounded-2xl bg-black/90 backdrop-blur-sm border-0">
          <Button variant="secondary" size="icon" className="absolute right-4 top-4 z-50 h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-0 rounded-xl shadow-lg hover:scale-110 transition-all duration-300" onClick={() => setViewerOpen(false)} aria-label="Fechar" >
            <Minimize2 className="h-5 w-5" />
          </Button>
          <div className="w-full h-full flex items-center justify-center p-8">
            {viewerUrl && (viewerIsVideo ? (
              <video src={viewerUrl} controls playsInline className="max-h-full max-w-full rounded-xl shadow-2xl" preload="metadata" autoPlay />
            ) : (
              <img src={viewerUrl} alt="Visualização" className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edição de Post (Modal) */}
      <Dialog open={!!editingPost} onOpenChange={(o) => { if (!o) setEditingPost(null); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>Editar Post</DialogTitle></DialogHeader>
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} />
          <DialogFooter><Button variant="outline" onClick={() => setEditingPost(null)}>Cancelar</Button><Button onClick={() => editMutation.mutate()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comentários (Modal) */}
      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => { if (!o) setOpeningCommentsFor(null); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader><DialogTitle>Comentários</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[50vh] space-y-4 pr-4">
            {loadingComments ? <p className="flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...</p> : (
              openPostComments?.length === 0 ? <p className="text-center text-muted-foreground">Nenhum comentário ainda.</p> : openPostComments?.map((c: any) => (
                <div key={c.id} className="flex gap-3 mb-4">
                  <Avatar className="h-8 w-8 ring-1 ring-primary/10"><AvatarImage src={c.author?.avatar_url} /><AvatarFallback>{c.author?.username?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        <UserLink userId={c.author?.id} username={c.author?.username}>
                          {c.author?.full_name || c.author?.username}
                        </UserLink>
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtDateTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap"><MentionText text={c.content} /></p>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
          <div className="mt-2 space-y-2">
            <Textarea 
              value={newCommentText} 
              onChange={(e) => setNewCommentText(e.target.value)} 
              placeholder="Escreva um comentário…" 
              rows={3} 
              className="rounded-xl border-border/50 focus:border-primary/50 transition-colors"
            />
            <div className="flex justify-end">
              <Button 
                onClick={() => addComment.mutate()} 
                disabled={!newCommentText.trim() || !openingCommentsFor}
                className="rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg transition-all duration-300"
              >
                Comentar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Usuários que Votaram (Modal) */}
      <Dialog open={voteUsersDialog.open} onOpenChange={(o) => { if (!o) setVoteUsersDialog({open: false, postId: null, voteType: null}); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {voteUsersDialog.voteType === "heart" ? <Heart className="h-5 w-5 text-red-500 fill-red-500" /> : <Bomb className="h-5 w-5 text-orange-500 fill-orange-500" />}
              {voteUsersDialog.voteType === "heart" ? "Aprovaram" : "Reprovaram"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-auto space-y-3">
            {voteUsers?.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8"><AvatarImage src={user.avatar_url} /><AvatarFallback>{user.username[0]}</AvatarFallback></Avatar>
                <UserLink userId={user.id} username={user.username} className="text-sm font-bold text-foreground hover:text-primary">{user.username}</UserLink>
              </div>
            ))}
            {voteUsers?.length === 0 && <p className="text-center text-muted-foreground text-sm">Nenhum voto ainda.</p>}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Estúdio IA (Modal) */}
      <Dialog open={aiEditing.open} onOpenChange={(o) => setAiEditing(prev => ({...prev, open: o}))}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-purple-500" /> Estúdio de Magia IA</DialogTitle>
            <DialogDescription>Toque em um estilo para transformar sua foto instantaneamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            {mediaFiles[aiEditing.imageIndex] && (
              <div className="relative aspect-square rounded-xl overflow-hidden bg-black/10 shadow-inner border border-border/50">
                <img src={URL.createObjectURL(mediaFiles[aiEditing.imageIndex])} alt="Preview" className="w-full h-full object-contain" />
                {aiEditing.loading && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin mb-3" />
                    <p className="text-white text-sm">Aplicando {AI_STYLES.find(s=>s.id === aiEditing.selectedStyle)?.label}...</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Seleção de Estilo */}
            <h4 className="text-sm font-semibold">Escolha um Estilo:</h4>
            <div className="grid grid-cols-3 gap-3">
              {AI_STYLES.map(style => (
                <Button key={style.id} onClick={() => handleApplyStyle(style.id)} variant="outline" className={cn("flex-col h-auto p-3 rounded-xl shadow-md", aiEditing.selectedStyle === style.id && "ring-2 ring-purple-500 bg-purple-50/50")}>
                  <style.icon className={cn("h-6 w-6 mb-1", style.color.replace('bg-', 'text-').replace('100', '600'))} />
                  <span className="text-xs font-medium text-center">{style.label}</span>
                </Button>
              ))}
            </div>
            
            <DialogFooter>
                <Button variant="outline" onClick={() => setAiEditing(prev => ({...prev, open: false}))}>Fechar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}