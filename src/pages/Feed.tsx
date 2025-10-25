import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, Bomb, X, Pencil, Trash2,
  Camera, Video, Maximize2, Minimize2, Images
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
import { Textarea } from "@/components/ui/textarea";

const MEDIA_PREFIX = { image: "image::", video: "video::" } as const;
const isVideoUrl = (u: string) =>
  u.startsWith(MEDIA_PREFIX.video) ||
  /\.(mp4|webm|ogg|mov|m4v)$/i.test(u.split("::").pop() || u);
const stripPrefix = (u: string) => u.replace(/^image::|^video::/, "");
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

async function validateVideoDuration(file: File, maxSeconds = 15) {
  if (!file.type.startsWith("video/")) return true;
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => resolve(v.duration);
      v.onerror = () => reject(new Error("Falha ao ler vídeo"));
    });
    return duration <= maxSeconds + 0.25;
  } finally {
    URL.revokeObjectURL(url);
  }
}
const isSecureOk = () =>
  window.isSecureContext || ["localhost", "127.0.0.1"].includes(location.hostname);
const pickBestMimeType = () => {
  const c = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
  ];
  for (const t of c) {
    try {
      if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t;
    } catch {}
  }
  return undefined;
};

type PostRow = any;

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [postTitle, setPostTitle] = useState("");
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);

  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);

  // ======= Gravação simples (SEM efeitos) =======
  const [recDialogOpen, setRecDialogOpen] = useState(false);
  const [recStream, setRecStream] = useState<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [recRecorder, setRecRecorder] = useState<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);
  const [recTime, setRecTime] = useState(0);
  const recTimerRef = useRef<number | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(null);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (!user) return;
    const markAsViewed = async () => {
      await supabase
        .from("last_viewed")
        .upsert(
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
      if (!user) return [];
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id);
      const friendIds = friendships?.map((f) => f.friend_id) || [];
      const allowedUserIds = [user.id, ...friendIds];
      const { data, error } = await supabase
        .from("posts")
        .select(
          `*, profiles:user_id (id, username, avatar_url, full_name),
           likes (id, user_id), comments (id), post_votes (id, user_id, vote_type)`
        )
        .or(
          `user_id.in.(${allowedUserIds.join(
            ","
          )}),is_community_approved.eq.true,voting_period_active.eq.true`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PostRow[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const ch = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () =>
        refetch()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () =>
        refetch()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () =>
        refetch()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "post_votes" }, () =>
        refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  useEffect(() => {
    const f = async () => {
      try {
        await supabase.functions.invoke("process-votes");
      } catch (e) {
        console.error(e);
      }
    };
    f();
    const i = setInterval(f, 60000);
    return () => clearInterval(i);
  }, []);

  // ===== Arquivos (galeria/câmera foto) =====
  const onFilesPicked = async (files: FileList | File[]) => {
    const arr = Array.from(files || []);
    const valid = arr.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (valid.length !== arr.length)
      toast({
        variant: "destructive",
        title: "Arquivos inválidos",
        description: "Apenas imagens e vídeos são permitidos.",
      });
    const accepted: File[] = [];
    for (const f of valid) {
      if (f.type.startsWith("video/")) {
        const ok = await validateVideoDuration(f, 15);
        if (!ok) {
          toast({
            variant: "destructive",
            title: "Vídeo muito longo",
            description: "Envie até 15 segundos.",
          });
          continue;
        }
      }
      accepted.push(f);
    }
    if (accepted.length) setMediaFiles((prev) => [...prev, ...accepted]);
  };
  const removeFile = (i: number) =>
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== i));

  // ===== Post =====
  const handleCreatePost = async () => {
    if (!postTitle.trim() && !newPost.trim() && mediaFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Adicione título, conteúdo ou mídia.",
      });
      return;
    }
    setUploading(true);
    try {
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const fileExt = (file.name.split(".").pop() || "").toLowerCase();
        const fileName = `${user?.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath);
        mediaUrls.push(
          (file.type.startsWith("video/") ? MEDIA_PREFIX.video : MEDIA_PREFIX.image) +
            publicUrl
        );
      }
      const votingEndsAt = new Date();
      votingEndsAt.setHours(votingEndsAt.getHours() + 1);
      const content = postTitle.trim() ? `${postTitle}\n\n${newPost}` : newPost;
      const { data: postData, error } = await supabase
        .from("posts")
        .insert({
          user_id: user?.id,
          content,
          media_urls: mediaUrls.length ? mediaUrls : null,
          voting_ends_at: votingEndsAt.toISOString(),
          voting_period_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      if (postData && user) {
        const { saveMentions } = await import("@/utils/mentionsHelper");
        await saveMentions(postData.id, "post", content, user.id);
      }
      toast({
        title: "Post criado!",
        description: "Sua postagem entrará em votação por 1 hora.",
      });
      setPostTitle("");
      setNewPost("");
      setMediaFiles([]);
      refetch();
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erro",
        description: e?.message || "Falha ao criar post",
      });
    } finally {
      setUploading(false);
    }
  };

  // ===== Votos/likes =====
  const handleVote = async (postId: string, voteType: "heart" | "bomb") => {
    try {
      const existingVote = posts
        ?.find((p: any) => p.id === postId)
        ?.post_votes?.find((v: any) => v.user_id === user?.id);
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("post_votes")
            .delete()
            .match({ post_id: postId, user_id: user?.id });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("post_votes")
            .update({ vote_type: voteType })
            .match({ post_id: postId, user_id: user?.id });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("post_votes")
          .insert({ post_id: postId, user_id: user?.id, vote_type: voteType });
        if (error) throw error;
      }
      refetch();
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erro ao votar",
        description: "Você precisa ser amigo do autor para votar.",
      });
    }
  };

  const handleLike = async (postId: string, hasLiked: boolean) => {
    try {
      if (hasLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .match({ post_id: postId, user_id: user?.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: user?.id });
        if (error) throw error;
      }
      refetch();
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erro ao curtir",
        description: "Você precisa ser amigo do autor para curtir.",
      });
    }
  };

  const getTimeRemaining = (votingEndsAt: string) => {
    const now = new Date();
    const end = new Date(votingEndsAt);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Votação encerrada";
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m restantes`;
  };

  const openEdit = (post: PostRow) => {
    setEditingPost(post);
    setEditContent(post.content || "");
  };
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingPost) return;
      const { error } = await supabase
        .from("posts")
        .update({
          content: editContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPost.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingPost(null);
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });
      toast({ title: "Post atualizado!" });
    },
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: e?.message || "Tente novamente.",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const tasks = [
        supabase.from("comments").delete().eq("post_id", postId),
        supabase.from("likes").delete().eq("post_id", postId),
        supabase.from("post_votes").delete().eq("post_id", postId),
      ];
      for (const t of tasks) {
        const { error } = await t;
        if (error) throw error;
      }
      const { error: delPostError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);
      if (delPostError) throw delPostError;
    },
    onSuccess: () => {
      toast({ title: "Post excluído." });
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });
    },
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: e?.message || "Tente novamente.",
      }),
  });

  // ===== Comentários =====
  const {
    data: openPostComments,
    refetch: refetchComments,
    isLoading: loadingComments,
  } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id],
    enabled: !!openingCommentsFor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          id, post_id, user_id, content, created_at,
          author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)
        `
        )
        .eq("post_id", openingCommentsFor!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!openingCommentsFor?.id || !user || !newCommentText.trim()) return;
      const { error } = await supabase.from("comments").insert({
        post_id: openingCommentsFor.id,
        content: newCommentText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNewCommentText("");
      await Promise.all([
        refetchComments(),
        queryClient.invalidateQueries({ queryKey: ["posts", user?.id] }),
      ]);
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao comentar",
        description: e?.message || "Verifique as políticas RLS.",
      });
    },
  });

  // ====== Câmera de vídeo simples (frontal/traseira + lista de dispositivos) ======
  const tryGetUserMedia = async () => {
    const tries: MediaStreamConstraints[] = [
      cameraDeviceId
        ? {
            video: {
              deviceId: { exact: cameraDeviceId },
              width: { ideal: 720 },
              height: { ideal: 1280 },
            },
            audio: true,
          }
        : {
            video: {
              facingMode: cameraFacing,
              width: { ideal: 720 },
              height: { ideal: 1280 },
            },
            audio: true,
          },
      cameraDeviceId
        ? { video: { deviceId: { exact: cameraDeviceId } }, audio: true }
        : { video: { facingMode: cameraFacing }, audio: true },
      { video: true, audio: true },
    ];
    let lastErr: any = null;
    for (const c of tries) {
      try {
        return await navigator.mediaDevices.getUserMedia(c);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };

  const startPreview = async () => {
    try {
      setUiError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setUiError("Seu navegador não suporta getUserMedia");
        return;
      }
      if (!isSecureOk()) {
        setUiError("Use HTTPS ou localhost para acessar a câmera");
        return;
      }

      const devices = await navigator.mediaDevices
        .enumerateDevices()
        .catch(() => [] as MediaDeviceInfo[]);
      setVideoInputs(devices.filter((d) => d.kind === "videoinput"));

      const stream = await tryGetUserMedia();
      setRecStream(stream);

      const videoEl = previewVideoRef.current!;
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play().catch(() => {});

      setIsPreviewing(true);
    } catch (e: any) {
      console.error(e);
      const msg = e?.name
        ? `${e.name}: ${e.message || ""}`
        : e?.message || "Falha ao abrir câmera";
      setUiError(msg);
      toast({
        variant: "destructive",
        title: "Não foi possível abrir a câmera",
        description: msg,
      });
    }
  };

  const restartPreviewWith = async (
    nextFacing: "user" | "environment",
    deviceId?: string | null
  ) => {
    if (recStream) recStream.getTracks().forEach((t) => t.stop());
    setCameraFacing(nextFacing);
    setCameraDeviceId(deviceId ?? null);
    setIsPreviewing(false);
    await startPreview();
  };

  const startRecording = async () => {
    if (!isPreviewing || !recStream) await startPreview();
    if (!recStream) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Câmera não iniciada.",
      });
      return;
    }
    const mime = pickBestMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        recStream,
        mime ? ({ mimeType: mime } as any) : undefined
      );
    } catch (err) {
      try {
        recorder = new MediaRecorder(recStream);
      } catch (e) {
        setUiError("Sem suporte a gravação nesta combinação de codecs.");
        toast({
          variant: "destructive",
          title: "Gravação indisponível",
          description: "Tente outro navegador/dispositivo.",
        });
        return;
      }
    }
    recChunks.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) recChunks.current.push(e.data);
    };
    recorder.start();
    setRecRecorder(recorder);
    setRecTime(0);
    if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    recTimerRef.current = window.setInterval(() => {
      setRecTime((t) => {
        const nt = t + 1;
        if (nt >= 15) stopRecording();
        return nt;
      });
    }, 1000) as unknown as number;
  };

  const stopRecording = () => {
    if (recRecorder && recRecorder.state !== "inactive") recRecorder.stop();
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setRecTime(0);
    const blob = new Blob(recChunks.current, {
      type: pickBestMimeType() || "video/webm",
    });
    if (blob.size > 0) {
      const file = new File([blob], `gravacao-${Date.now()}.webm`, {
        type: pickBestMimeType() || "video/webm",
      });
      setMediaFiles((prev) => [...prev, file]);
      toast({
        title: "Vídeo adicionado",
        description: "Gravação de até 15s salva na postagem.",
      });
    }
    setRecRecorder(null);
  };

  const stopPreview = () => {
    if (recStream) recStream.getTracks().forEach((t) => t.stop());
    setRecStream(null);
    setIsPreviewing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="border shadow-sm bg-card">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Input
                  placeholder="Título da publicação (opcional)"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="font-medium"
                />
                <MentionTextarea
                  placeholder="O que você está pensando? Use @ para mencionar alguém"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[80px] resize-none"
                />

                {mediaFiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={URL.createObjectURL(file)}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <input
                      ref={galleryInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => onFilesPicked(e.target.files!)}
                    />
                    <input
                      ref={cameraPhotoInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => onFilesPicked(e.target.files!)}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => galleryInputRef.current?.click()}
                      aria-label="Abrir galeria"
                    >
                      <Images className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => cameraPhotoInputRef.current?.click()}
                      aria-label="Abrir câmera (foto)"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => setRecDialogOpen(true)}
                      aria-label="Abrir câmera (vídeo)"
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleCreatePost}
                    disabled={
                      (!postTitle.trim() && !newPost.trim() && mediaFiles.length === 0) ||
                      uploading
                    }
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
                  >
                    {uploading ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        {posts?.map((post: any) => {
          const isOwnPost = post.user_id === user?.id;
          const hasLiked = post.likes?.some((l: any) => l.user_id === user?.id);
          const likesCount = post.likes?.length || 0;
          const commentsCount = post.comments?.length || 0;
          const heartVotes =
            post.post_votes?.filter((v: any) => v.vote_type === "heart").length ||
            0;
          const bombVotes =
            post.post_votes?.filter((v: any) => v.vote_type === "bomb").length ||
            0;
          const userVote = post.post_votes?.find((v: any) => v.user_id === user?.id);
          const isVotingActive = post.voting_period_active && post.voting_ends_at;
          const mediaList: string[] = post.media_urls || [];
          return (
            <Card
              key={post.id}
              className={cn(
                "border shadow-sm bg-card hover:shadow-md transition-shadow",
                post.is_community_approved && "border-primary/50"
              )}
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <UserLink
                        userId={post.user_id}
                        username={post.profiles?.username || ""}
                      >
                        {post.profiles?.username}
                      </UserLink>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(post.created_at)}
                      </p>
                    </div>
                  </div>

                  {isOwnPost && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Opções da postagem"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => openEdit(post)}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Editar postagem
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(post.id)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir postagem
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {post.is_community_approved && (
                  <Badge className="mb-2 bg-gradient-to-r from-primary to-secondary">
                    ✓ Aprovado pela Comunidade
                  </Badge>
                )}

                <p className="text-foreground leading-relaxed">
                  <MentionText text={post.content ?? ""} />
                </p>

                {mediaList.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {mediaList.map((raw: string, index: number) => {
                      const url = stripPrefix(raw);
                      const v = isVideoUrl(raw);
                      return (
                        <button
                          key={index}
                          className="rounded-lg overflow-hidden group relative"
                          onClick={() => {
                            setViewerUrl(url);
                            setViewerIsVideo(v);
                            setViewerOpen(true);
                          }}
                        >
                          {v ? (
                            <video
                              src={url}
                              className="w-full max-h-64 object-cover"
                              controls
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img src={url} alt="Post media" className="w-full h-auto" />
                          )}
                          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                            <Maximize2 className="inline h-3 w-3 mr-1" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isVotingActive && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {getTimeRemaining(post.voting_ends_at)}
                      </span>
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-red-500 text-red-500" />{" "}
                          {heartVotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bomb className="h-3 w-3 fill-orange-500 text-orange-500" />{" "}
                          {bombVotes}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1",
                          userVote?.vote_type === "heart" &&
                            "bg-red-500/10 border-red-500 text-red-500"
                        )}
                        onClick={() => handleVote(post.id, "heart")}
                      >
                        <Heart
                          className={cn(
                            "h-4 w-4 mr-2",
                            userVote?.vote_type === "heart" && "fill-current"
                          )}
                        />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1",
                          userVote?.vote_type === "bomb" &&
                            "bg-orange-500/10 border-orange-500 text-orange-500"
                        )}
                        onClick={() => handleVote(post.id, "bomb")}
                      >
                        <Bomb
                          className={cn(
                            "h-4 w-4 mr-2",
                            userVote?.vote_type === "bomb" && "fill-current"
                          )}
                        />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id, hasLiked)}
                    className={hasLiked ? "text-red-500 hover:text-red-600" : ""}
                  >
                    <Heart
                      className={cn("h-5 w-5 mr-2", hasLiked && "fill-current")}
                    />
                    {likesCount}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpeningCommentsFor(post)}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    {commentsCount}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Send className="h-5 w-5 mr-2" />
                    Compartilhar
                  </Button>
                  <Button variant="ghost" size="sm" className="ml-auto">
                    <Bookmark className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {posts?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum post ainda. Seja o primeiro a publicar!
            </p>
          </div>
        )}
      </div>

      {/* Viewer full-screen */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-2 sm:p-4">
          <div className="relative">
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setViewerOpen(false)}
              aria-label="Fechar"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <div className="w-full h-full flex items-center justify-center">
              {viewerUrl &&
                (viewerIsVideo ? (
                  <video
                    src={viewerUrl}
                    controls
                    playsInline
                    className="max-h-[80vh] max-w-full rounded-lg"
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={viewerUrl}
                    alt="Mídia"
                    className="max-h-[80vh] max-w-full rounded-lg"
                  />
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editingPost} onOpenChange={(o) => !o && setEditingPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar postagem</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={8}
            placeholder="Edite o conteúdo da postagem"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPost(null)}>
              Cancelar
            </Button>
            <Button onClick={() => editMutation.mutate()}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comentários */}
      <Dialog
        open={!!openingCommentsFor}
        onOpenChange={(o) => {
          if (!o) setOpeningCommentsFor(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto space-y-4 pr-1">
            {loadingComments ? (
              <p className="text-sm text-muted-foreground">Carregando comentários...</p>
            ) : (openPostComments?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Seja o primeiro a comentar!</p>
            ) : (
              openPostComments!.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.author?.avatar_url || ""} />
                    <AvatarFallback>
                      {c.author?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        <UserLink userId={c.author?.id} username={c.author?.username}>
                          {c.author?.full_name || c.author?.username}
                        </UserLink>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDateTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 space-y-2">
            <Textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Escreva um comentário…"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => addComment.mutate()}
                disabled={!newCommentText.trim() || !openingCommentsFor}
              >
                Comentar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gravador simples (vídeo até 15s) */}
      <Dialog
        open={recDialogOpen}
        onOpenChange={(o) => {
          setRecDialogOpen(o);
          if (o) {
            startPreview();
          } else {
            stopRecording();
            stopPreview();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Gravar vídeo (até 15s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uiError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {uiError}
              </div>
            )}

            <video
              ref={previewVideoRef}
              className="w-full aspect-[9/16] bg-black rounded"
              autoPlay
              playsInline
              muted
            />

            {/* Câmeras */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Câmera</label>
                <div className="flex gap-2">
                  <Button
                    variant={cameraFacing === "user" ? "default" : "outline"}
                    size="sm"
                    onClick={() => restartPreviewWith("user")}
                  >
                    Frontal
                  </Button>
                  <Button
                    variant={cameraFacing === "environment" ? "default" : "outline"}
                    size="sm"
                    onClick={() => restartPreviewWith("environment")}
                  >
                    Traseira
                  </Button>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Dispositivo</label>
                <select
                  className="w-full border rounded px-2 py-1 h-9 bg-background"
                  value={cameraDeviceId ?? ""}
                  onChange={(e) =>
                    restartPreviewWith(cameraFacing, e.target.value || null)
                  }
                >
                  <option value="">Padrão ({cameraFacing})</option>
                  {videoInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {recRecorder
                  ? `${recTime}s / 15s`
                  : isPreviewing
                  ? "Pré-visualização ativa"
                  : "Carregando câmera..."}
              </span>
              <div className="flex gap-2">
                {!recRecorder ? (
                  <Button onClick={startRecording}>
                    <Video className="h-4 w-4 mr-2" />
                    Iniciar
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={stopRecording}>
                    <Video className="h-4 w-4 mr-2" />
                    Parar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
