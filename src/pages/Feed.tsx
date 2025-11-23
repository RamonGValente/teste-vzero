import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, Bomb, X, Pencil, Trash2,
  Camera, Video, Maximize2, Minimize2, Images, RotateCcw, Play, Mic, Square,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Users, Sparkles, Wand2,
  Palette, Sun, Moon, Monitor, Zap, Skull, Film, Music, Baby, Brush, PenTool, Ghost, Smile
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

/* ---------- Video Auto Player Hook ---------- */
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

/* ---------- Audio Recording Hook ---------- */
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
          if (dur === 0 || dur <= 10) accepted.push(f);
          else toast({ variant: "destructive", title: "Áudio longo", description: "Máximo 10 segundos." });
        }
      } catch (err) { console.error(err); }
    }
    setProcessing(false);
    if (accepted.length) setMediaFiles(prev => [...prev, ...accepted]);
  };

  const removeFile = (idx: number) => setMediaFiles(prev => prev.filter((_, i) => i !== idx));

  /* --------- LÓGICA IA SENSACIONAL (Presets + Fallback Expandido) ---------- */
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  };

  const createFileFromBase64 = async (base64: string, filename: string): Promise<File> => {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: "image/jpeg", lastModified: Date.now() });
  };

  // Processamento Local com Filtros Matemáticos Completos
  const processImageLocally = async (base64Image: string, filterType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;

        // Desenha original
        ctx.drawImage(img, 0, 0);

        /* APLICAÇÃO DE FILTROS ESPECÍFICOS (Rejuvenescer Brutal) */
        if (filterType === 'rejuvenate') {
          // 1. Criar camada de suavização (Botox Digital)
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(canvas, 0, 0);
          
          // Desfocar uma cópia
          ctx.filter = 'blur(6px)'; 
          ctx.drawImage(canvas, 0, 0);
          
          // Misturar original (para manter olhos/boca) com o desfoque (pele lisa)
          ctx.filter = 'none';
          ctx.globalAlpha = 0.6; // 60% original, 40% blur
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalAlpha = 1.0;

          // 2. Iluminação de Estúdio (Screen) - Remove sombras duras (rugas)
          ctx.globalCompositeOperation = 'screen';
          ctx.filter = 'brightness(1.1) contrast(1.1)';
          ctx.drawImage(canvas, 0, 0);

          // 3. Tom de Pele Jovem (Pêssego/Rosado)
          ctx.globalCompositeOperation = 'soft-light';
          ctx.fillStyle = '#ffc0cb'; // Pink suave
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 4. Acabamento Final
          ctx.globalCompositeOperation = 'source-over';
          ctx.filter = 'saturate(1.1)'; // Devolver vida
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
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, 'rgba(100, 0, 255, 0.2)'); 
          gradient.addColorStop(1, 'rgba(255, 0, 100, 0.2)'); 
          ctx.fillStyle = gradient;
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
          ctx.filter = 'grayscale(1.0) contrast(1.2) brightness(1.1)';
          ctx.drawImage(canvas, 0, 0);
        }
        else if (filterType === 'vintage') {
          ctx.filter = 'sepia(0.8) brightness(0.9) contrast(1.2)';
          ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'cyberpunk') {
          ctx.filter = 'contrast(1.4) saturate(1.5)';
          ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'color-dodge';
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, 'rgba(255, 0, 255, 0.3)'); 
          gradient.addColorStop(1, 'rgba(0, 255, 255, 0.3)'); 
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'matrix') {
          ctx.filter = 'grayscale(1.0) contrast(1.5) brightness(0.8)';
          ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'anime') {
          ctx.filter = 'saturate(2.5) contrast(1.2) brightness(1.1)';
          ctx.drawImage(canvas, 0, 0);
        }
        else if (filterType === 'terror') {
          ctx.filter = 'grayscale(0.8) contrast(1.8) brightness(0.6)';
          ctx.drawImage(canvas, 0, 0);
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = 'rgba(100, 0, 0, 0.4)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else if (filterType === 'cold') {
          ctx.filter = 'saturate(0.8) brightness(1.1)';
          ctx.drawImage(canvas, 0, 0);
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
      const base64Image = await fileToBase64(imageFile);
      let processedImageBase64: string;

      try {
        // Tentar API (Nuvem)
        const response = await fetch('/.netlify/functions/huggingface-proxy', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: selectedStyle.prompt, image: base64Image }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Fallback requested");
        processedImageBase64 = result.image;
        toast({ title: "✨ Sucesso!", description: `Estilo ${selectedStyle.label} aplicado via Nuvem.` });

      } catch (apiError) {
        console.log("Usando processamento local:", apiError);
        // Fallback Local
        processedImageBase64 = await processImageLocally(base64Image, selectedStyle.filter);
        toast({ title: "⚡ Rápido", description: `Filtro ${selectedStyle.label} aplicado localmente.` });
      }

      const newFile = await createFileFromBase64(processedImageBase64, `ai-${selectedStyle.id}-${Date.now()}.jpg`);
      setMediaFiles(prev => {
        const updated = [...prev];
        updated[aiEditing.imageIndex] = newFile;
        return updated;
      });
      
      setAiEditing({open: false, imageIndex: -1, selectedStyle: null, loading: false});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao transformar imagem." });
      setAiEditing(prev => ({...prev, loading: false}));
    }
  };

  /* --------- Handlers Gerais ---------- */
  const handleStartRecording = async () => { try { await startRecording(); toast({ title: "Gravando..." }); } catch (error: any) { toast({ variant: "destructive", title: "Erro", description: error.message }); } };
  const handleStopRecording = () => { stopRecording(); toast({ title: "Áudio gravado!" }); };

  const handleCreatePost = async () => {
    if (postType === 'photo_audio' && (!audioBlob || mediaFiles.length === 0)) { toast({ variant: "destructive", title: "Erro", description: "Requer foto e áudio." }); return; }
    if (postType === 'standard' && !newPost.trim() && mediaFiles.length === 0) { toast({ variant: "destructive", title: "Erro", description: "Adicione conteúdo." }); return; }
    
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

      const votingEndsAt = new Date(); votingEndsAt.setHours(votingEndsAt.getHours() + 1);
      const content = postType === 'photo_audio' ? '' : newPost;

      const { data: postData, error } = await supabase.from("posts").insert({
          user_id: user?.id, content, media_urls: mediaUrls.length ? mediaUrls : null,
          audio_url: audioUrl, post_type: postType, voting_ends_at: votingEndsAt.toISOString(), voting_period_active: true,
      }).select().single();
      if (error) throw error;

      if (postData && user && content) { const { saveMentions } = await import("@/utils/mentionsHelper"); await saveMentions(postData.id, "post", content, user.id); }

      toast({ title: "Post criado!" });
      setNewPost(""); setMediaFiles([]); resetRecording(); setPostType('standard'); refetch();
    } catch (e: any) { toast({ variant: "destructive", title: "Erro", description: e?.message }); } finally { setUploading(false); }
  };

  /* Carousel Helpers */
  const stopCurrentAudio = () => { if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; } setPlayingAudio(null); };
  const handlePhotoAudioPlay = (audioUrl: string, postId: string) => {
    stopCurrentAudio(); setPlayingAudio(audioUrl);
    const audio = new Audio(stripPrefix(audioUrl));
    currentAudioRef.current = audio;
    audio.onended = () => { setPlayingAudio(null); currentAudioRef.current = null; };
    audio.play().catch(console.error);
  };
  const nextCarouselItem = () => { stopCurrentAudio(); const p = posts?.filter(x => x.post_type === 'photo_audio') || []; if (p.length) setCurrentCarouselIndex((currentCarouselIndex + 1) % p.length); };
  const prevCarouselItem = () => { stopCurrentAudio(); const p = posts?.filter(x => x.post_type === 'photo_audio') || []; if (p.length) setCurrentCarouselIndex((currentCarouselIndex - 1 + p.length) % p.length); };
  
  const handleTouchStart = (e: React.TouchEvent) => { setIsDragging(true); setStartX(e.touches[0].clientX); setCurrentTranslate(0); };
  const handleTouchMove = (e: React.TouchEvent) => { if (!isDragging) return; setCurrentTranslate(e.touches[0].clientX - startX); };
  const handleTouchEnd = () => { if (!isDragging) return; setIsDragging(false); if (currentTranslate > 50) prevCarouselItem(); else if (currentTranslate < -50) nextCarouselItem(); setCurrentTranslate(0); };

  const renderPhotoAudioCarousel = () => {
    const p = posts?.filter(x => x.post_type === 'photo_audio') || [];
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
            <div className="flex items-center gap-2 bg-background/80 rounded-full px-3 py-1.5 shadow-sm"><span className="text-sm font-semibold text-primary">{currentCarouselIndex + 1}</span><span className="text-sm text-muted-foreground">/</span><span className="text-sm text-muted-foreground">{p.length}</span></div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20 shadow-md"><AvatarImage src={curr.profiles?.avatar_url} /><AvatarFallback>{curr.profiles?.username?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0"><UserLink userId={curr.user_id} username={curr.profiles?.username || ""} className="text-sm font-semibold hover:text-primary truncate">{curr.profiles?.username}</UserLink></div>
            </div>
            <div className="relative">
              {p.length > 1 && (
                <>
                  <button onClick={prevCarouselItem} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-2 rounded-full hover:scale-110"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={nextCarouselItem} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-2 rounded-full hover:scale-110"><ChevronRight className="h-4 w-4" /></button>
                </>
              )}
              <div ref={carouselRef} className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-black cursor-grab active:cursor-grabbing" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: `translateX(${currentTranslate}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}>
                {img && (
                  <>
                    <img src={img} alt="Post" className="w-full h-full object-cover" />
                    {aud && (
                      <button onClick={() => isPlaying ? stopCurrentAudio() : handlePhotoAudioPlay(curr.audio_url, curr.id)} className={cn("absolute bottom-4 right-4 z-10 p-3 rounded-full shadow-2xl transition-all hover:scale-110", isPlaying ? "bg-gradient-to-r from-primary to-secondary text-white scale-110" : "bg-white/90 text-foreground")}>
                        <Volume2 className={cn("h-5 w-5", isPlaying && "animate-pulse")} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  /* Helpers de Interação */
  const handleVote = async (postId: string, voteType: "heart" | "bomb") => {
    try {
      const existing = posts?.find((p: any) => p.id === postId)?.post_votes?.find((v: any) => v.user_id === user?.id);
      if (existing) {
        if (existing.vote_type === voteType) await supabase.from("post_votes").delete().match({ post_id: postId, user_id: user?.id });
        else await supabase.from("post_votes").update({ vote_type: voteType }).match({ post_id: postId, user_id: user?.id });
      } else await supabase.from("post_votes").insert({ post_id: postId, user_id: user?.id, vote_type: voteType });
      refetch();
    } catch {}
  };
  const handleShowVoteUsers = (postId: string, voteType: "heart" | "bomb") => setVoteUsersDialog({ open: true, postId, voteType });
  const handleLike = async (postId: string, hasLiked: boolean) => {
    try {
      if (hasLiked) await supabase.from("likes").delete().match({ post_id: postId, user_id: user?.id });
      else await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
      refetch();
    } catch {}
  };
  const openEdit = (post: PostRow) => { setEditingPost(post); setEditContent(post.content || ""); };

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
    mutationFn: async () => { if (!openingCommentsFor?.id || !user || !newCommentText.trim()) return; await supabase.from("comments").insert({ post_id: openingCommentsFor.id, user_id: user.id, content: newCommentText.trim() }); },
    onSuccess: async () => { setNewCommentText(""); await Promise.all([refetchComments(), queryClient.invalidateQueries({ queryKey: ["posts", user?.id] })]); },
    onError: () => toast({ variant: "destructive", title: "Erro ao comentar" }),
  });
  const editMutation = useMutation({
    mutationFn: async () => { if (!editingPost) return; await supabase.from("posts").update({ content: editContent, updated_at: new Date().toISOString() }).eq("id", editingPost.id); },
    onSuccess: () => { setEditingPost(null); queryClient.invalidateQueries({ queryKey: ["posts", user?.id] }); toast({ title: "Atualizado!" }); },
    onError: () => toast({ variant: "destructive", title: "Erro" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from("comments").delete().eq("post_id", postId); await supabase.from("likes").delete().eq("post_id", postId); await supabase.from("post_votes").delete().eq("post_id", postId); await supabase.from("posts").delete().eq("id", postId);
    },
    onSuccess: () => { toast({ title: "Excluído" }); queryClient.invalidateQueries({ queryKey: ["posts", user?.id] }); },
    onError: () => toast({ variant: "destructive", title: "Erro" }),
  });

  useEffect(() => { return () => stopCurrentAudio(); }, []);

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        <div className="flex justify-center">
          <img src="https://sistemaapp.netlify.app/assets/logo-wTbWaudN.png" alt="Logo" className="w-40 h-40 md:w-48 md:h-48 object-contain"/>
        </div>

        {/* Composer */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex gap-2 mb-4">
              <Button variant={postType === 'standard' ? "default" : "outline"} onClick={() => setPostType('standard')} className="rounded-xl" size="sm">Feed</Button>
              <Button variant={postType === 'photo_audio' ? "default" : "outline"} onClick={() => setPostType('photo_audio')} className="rounded-xl" size="sm">Flash</Button>
            </div>

            <div className="flex gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-sm"><AvatarImage src={user?.user_metadata?.avatar_url} /><AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
              <div className="flex-1 space-y-3">
                {postType === 'standard' && <MentionTextarea placeholder="O que você está pensando?" value={newPost} onChange={(e) => setNewPost(e.target.value)} className="min-h-[80px] resize-none border-0 bg-muted/50 shadow-inner focus:bg-background/50 rounded-xl"/>}
                {postType === 'photo_audio' && (
                  <div className="text-center py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">Foto + Áudio (10s)</p>
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

                {mediaFiles.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shadow-lg flex items-center justify-center">
                          {file.type.startsWith("image/") ? <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" /> : <Video className="h-8 w-8 text-muted-foreground" />}
                        </div>
                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110" onClick={() => removeFile(index)}><X className="h-3 w-3" /></Button>
                        {file.type.startsWith("image/") && (
                          <Button variant="default" size="icon" className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-110 transition-transform" onClick={() => setAiEditing({open: true, imageIndex: index, selectedStyle: null, loading: false})}>
                            <Wand2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden Inputs */}
                <input ref={galleryInputRef} type="file" className="hidden" accept="image/*,video/*" multiple onChange={(e) => onFilesPicked(e.target.files)} />
                <input ref={cameraPhotoInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => onFilesPicked(e.target.files)} />
                <input ref={cameraVideoInputRef} type="file" className="hidden" accept="video/*" capture="environment" onChange={(e) => onFilesPicked(e.target.files)} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => galleryInputRef.current?.click()}><Images className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => cameraPhotoInputRef.current?.click()}><Camera className="h-5 w-5" /></Button>
                    
                    {/* NOVO BOTÃO DE IA (Atua como Galeria) */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Sparkles className="h-5 w-5" />
                    </Button>

                    {postType === 'standard' && <Button variant="ghost" size="icon" onClick={() => cameraVideoInputRef.current?.click()}><Video className="h-5 w-5" /></Button>}
                    {processing && <span className="text-xs text-muted-foreground ml-2"><RotateCcw className="h-3 w-3 animate-spin inline" /> processando...</span>}
                  </div>
                  <Button onClick={handleCreatePost} disabled={uploading} className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold">{uploading ? "Publicando..." : "Publicar"}</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flash Carousel */}
        {renderPhotoAudioCarousel()}

        {/* Main Feed */}
        {posts?.map((post) => {
          const isOwnPost = post.user_id === user?.id;
          const hasLiked = post.likes?.some((l: any) => l.user_id === user?.id);
          if (post.post_type === 'photo_audio') return null;

          return (
            <Card key={post.id} className={cn("border-0 shadow-lg bg-gradient-to-br from-card to-card/80 backdrop-blur-sm", post.is_community_approved && "ring-1 ring-primary/30")}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarImage src={post.profiles?.avatar_url} /><AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback></Avatar>
                    <div><UserLink userId={post.user_id} username={post.profiles?.username || ""}>{post.profiles?.username}</UserLink><p className="text-xs text-muted-foreground">{fmtDateTime(post.created_at)}</p></div>
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

                {post.is_community_approved && <Badge className="mb-2">✓ Aprovado</Badge>}
                {post.content && <p className="text-foreground leading-relaxed"><MentionText text={post.content ?? ""} /></p>}

                {post.media_urls?.length > 0 && (
                  <div className={cn("grid gap-3 mt-3", post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                    {post.media_urls.map((raw: string, index: number) => {
                      const url = stripPrefix(raw);
                      const isVideo = isVideoUrl(raw);
                      const videoId = `${post.id}-${index}`;
                      return (
                        <div key={index} className="rounded-xl overflow-hidden group relative bg-muted shadow-lg">
                          {isVideo ? (
                            <div className="relative w-full aspect-square">
                              <video ref={(el) => { if (el) { registerVideo(videoId, el); el.setAttribute('data-video-id', videoId); } else unregisterVideo(videoId); }} src={url} className="w-full h-full object-cover" playsInline loop muted={muted} onClick={() => playingVideo === videoId ? pauseVideo(videoId) : playVideo(videoId)} />
                              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="absolute bottom-3 left-3 bg-black/50 text-white p-2 rounded-full">{muted ? <VolumeX className="h-3 w-3"/> : <Volume2 className="h-3 w-3"/>}</button>
                            </div>
                          ) : (
                            <button onClick={() => { setViewerUrl(url); setViewerIsVideo(false); setViewerOpen(true); }} className="w-full aspect-square">
                              <img src={url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {post.voting_period_active && post.voting_ends_at && (
                  <div className="bg-muted/30 rounded-2xl p-4 space-y-3 border border-border/20">
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">Votação ativa</span>
                       <div className="flex gap-3 text-xs">
                         <button onClick={() => handleShowVoteUsers(post.id, "heart")} className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full"><Heart className="h-3 w-3 text-red-500 fill-red-500"/> {post.post_votes?.filter((v:any)=>v.vote_type==="heart").length}</button>
                         <button onClick={() => handleShowVoteUsers(post.id, "bomb")} className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full"><Bomb className="h-3 w-3 text-orange-500 fill-orange-500"/> {post.post_votes?.filter((v:any)=>v.vote_type==="bomb").length}</button>
                       </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleVote(post.id, "heart")}><Heart className="h-4 w-4 mr-2"/> Aprovar</Button>
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleVote(post.id, "bomb")}><Bomb className="h-4 w-4 mr-2"/> Rejeitar</Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-border/20">
                  <Button variant="ghost" size="sm" onClick={() => handleLike(post.id, hasLiked)} className={cn("rounded-xl", hasLiked && "text-red-500")}>
                    <Heart className={cn("h-5 w-5 mr-2", hasLiked && "fill-current")} /> {post.likes?.length || 0}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setOpeningCommentsFor(post)} className="rounded-xl"><MessageCircle className="h-5 w-5 mr-2" /> {post.comments?.length || 0}</Button>
                  <Button variant="ghost" size="sm" className="ml-auto rounded-xl"><Bookmark className="h-5 w-5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* --- DIALOGS --- */}

      {/* AI Editing (Com Botões Expandidos) */}
      <Dialog open={aiEditing.open} onOpenChange={(open) => setAiEditing(prev => ({...prev, open}))}>
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
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <Sparkles className="h-8 w-8 animate-spin mb-2 text-purple-400" />
                    <span className="text-sm font-medium">Aplicando mágica...</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Grid de Botões de Estilo */}
            <ScrollArea className="h-[200px] pr-4">
              <div className="grid grid-cols-2 gap-3">
                {AI_STYLES.map((style) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.id}
                      disabled={aiEditing.loading}
                      onClick={() => handleApplyStyle(style.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left group",
                        "hover:shadow-md hover:scale-[1.02] active:scale-95",
                        aiEditing.loading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/30 cursor-pointer bg-card"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg shrink-0 transition-colors", style.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold group-hover:text-primary transition-colors">{style.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiEditing(p => ({...p, open: false}))}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Other Dialogs (Mantidos) */}
      <Dialog open={voteUsersDialog.open} onOpenChange={(open) => setVoteUsersDialog(prev => ({...prev, open}))}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Votos</DialogTitle></DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-3">{voteUsers?.map((u) => (<div key={u.id} className="flex items-center gap-3 p-2"><Avatar><AvatarImage src={u.avatar_url}/><AvatarFallback>{u.username[0]}</AvatarFallback></Avatar><span>{u.username}</span></div>))}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-0">
          <div className="relative flex justify-center items-center h-[80vh]">
            <Button className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/70 text-white border-0" size="icon" onClick={() => setViewerOpen(false)}><Minimize2/></Button>
            {viewerUrl && (viewerIsVideo ? <video src={viewerUrl} controls className="max-h-full max-w-full" /> : <img src={viewerUrl} className="max-h-full max-w-full object-contain" alt="Zoom" />)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPost} onOpenChange={(o) => !o && setEditingPost(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>Editar</DialogTitle></DialogHeader>
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} />
          <DialogFooter><Button variant="outline" onClick={() => setEditingPost(null)}>Cancelar</Button><Button onClick={() => editMutation.mutate()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => { if (!o) setOpeningCommentsFor(null); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader><DialogTitle>Comentários</DialogTitle></DialogHeader>
          <div className="max-h-[50vh] overflow-auto space-y-4">
            {loadingComments ? <p>Carregando...</p> : openPostComments?.map((c: any) => (
              <div key={c.id} className="flex gap-3"><Avatar className="h-8 w-8"><AvatarImage src={c.author?.avatar_url} /><AvatarFallback>{c.author?.username?.[0]}</AvatarFallback></Avatar><div><p className="text-sm font-bold">{c.author?.username}</p><p className="text-sm">{c.content}</p></div></div>
            ))}
          </div>
          <div className="flex gap-2"><Input value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Escreva..." /><Button onClick={() => addComment.mutate()}><Send className="h-4 w-4"/></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}