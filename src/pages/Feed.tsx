import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Send, Bookmark, MoreVertical, Bomb, X, Pencil, Trash2,
  Camera, Video, Maximize2, Minimize2, Images, RotateCcw, Play
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

/* ---------- Helpers ---------- */
const MEDIA_PREFIX = { image: "image::", video: "video::" } as const;
const isVideoUrl = (u: string) =>
  u.startsWith(MEDIA_PREFIX.video) ||
  /\.(mp4|webm|ogg|mov|m4v)$/i.test(u.split("::").pop() || u);
const stripPrefix = (u: string) => u.replace(/^image::|^video::/, "");
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

/** Lê duração com fallback e timeout (Safari/Android às vezes não carrega metadata) */
async function getVideoDurationSafe(file: File, timeoutMs = 4000): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    const done = (sec: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(sec);
    };
    const timer = setTimeout(() => done(0), timeoutMs);
    v.onloadedmetadata = () => {
      clearTimeout(timer);
      done(isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => {
      clearTimeout(timer);
      done(0);
    };
    v.src = url;
  });
}

/** Comprime imagem: redimensiona máx. 1440px (lado maior) e salva JPEG q=0.8 */
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

/* ---------- Component ---------- */
export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* Compose */
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  /* Native Inputs */
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);

  /* Edit/Comments/Viewer */
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);

  /* Mark as viewed */
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

  /* Load posts */
  const { data: posts, refetch } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: friendships } = await supabase
        .from("friendships").select("friend_id").eq("user_id", user.id);
      const friendIds = friendships?.map((f) => f.friend_id) || [];
      const allowedUserIds = [user.id, ...friendIds];

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url, full_name),
          likes (id, user_id),
          comments (id),
          post_votes (id, user_id, vote_type)
        `)
        .or(
          `user_id.in.(${allowedUserIds.join(",")}),is_community_approved.eq.true,voting_period_active.eq.true`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PostRow[];
    },
    enabled: !!user,
  });

  /* Realtime */
  useEffect(() => {
    const ch = supabase
      .channel("feed-realtime")
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

  /* --------- Media picking (Galeria/Foto/Video) ---------- */
  const onFilesPicked = async (files?: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    setProcessing(true);
    const accepted: File[] = [];

    for (const f of list) {
      try {
        if (f.type.startsWith("image/")) {
          // compressão de imagem
          const small = await compressImage(f, 1440, 0.8);
          accepted.push(small);
        } else if (f.type.startsWith("video/")) {
          // validação de duração (≤15s). Safari pode retornar 0 => se 0, aceitamos e validamos depois do upload.
          const dur = await getVideoDurationSafe(f).catch(() => 0);
          if (dur === 0) {
            console.warn("[video] duração não lida; aceitando mesmo assim para não travar UX.");
            accepted.push(f);
          } else if (dur <= 15.3) {
            accepted.push(f);
          } else {
            toast({
              variant: "destructive",
              title: "Vídeo acima de 15s",
              description: "Grave novamente com até 15 segundos.",
            });
          }
        } else {
          toast({ variant: "destructive", title: "Arquivo inválido", description: "Apenas imagem ou vídeo." });
        }
      } catch (err) {
        console.error("Erro ao processar arquivo:", err);
        toast({ variant: "destructive", title: "Erro ao processar mídia", description: "Tente novamente." });
      }
    }

    setProcessing(false);
    if (accepted.length) setMediaFiles(prev => [...prev, ...accepted]);
  };

  const removeFile = (idx: number) =>
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));

  /* --------- Create Post (upload + insert) ---------- */
  const handleCreatePost = async () => {
    if (!newPost.trim() && mediaFiles.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Adicione conteúdo ou mídia." });
      return;
    }
    setUploading(true);
    try {
      const mediaUrls: string[] = [];

      for (const file of mediaFiles) {
        // valida de novo duração se possível (para vídeos que retornaram 0 antes)
        if (file.type.startsWith("video/")) {
          const dur = await getVideoDurationSafe(file).catch(() => 0);
          if (dur > 15.3) {
            toast({
              variant: "destructive",
              title: "Vídeo acima de 15s",
              description: "Grave novamente com até 15 segundos.",
            });
            setUploading(false);
            return;
          }
        }

        // nome seguro
        const extGuess = file.type.startsWith("video/")
          ? (file.name.split(".").pop()?.toLowerCase() || "mp4")
          : "jpg";
        const fileExt = (file.name.split(".").pop() || extGuess).toLowerCase();
        const fileName = `${user?.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        // upload
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || (fileExt === "jpg" ? "image/jpeg" : undefined),
          });

        if (upErr) {
          console.error("Upload error:", upErr);
          throw upErr;
        }

        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(filePath);
        mediaUrls.push((file.type.startsWith("video/") ? MEDIA_PREFIX.video : MEDIA_PREFIX.image) + publicUrl);
      }

      const votingEndsAt = new Date(); votingEndsAt.setHours(votingEndsAt.getHours() + 1);
      const content = newPost;

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

      if (error) {
        console.error("Insert post error:", error);
        throw error;
      }

      if (postData && user) {
        const { saveMentions } = await import("@/utils/mentionsHelper");
        await saveMentions(postData.id, "post", content, user.id);
      }

      toast({ title: "Post criado!", description: "Sua postagem entrou no feed." });
      setNewPost(""); setMediaFiles([]);
      refetch();
    } catch (e: any) {
      console.error("Falha ao publicar:", e);
      toast({
        variant: "destructive",
        title: "Erro ao publicar",
        description: e?.message || "Não foi possível criar o post. Veja o console para detalhes.",
      });
    } finally {
      setUploading(false);
    }
  };

  /* --------- Vote/Like/Comments/Edit/Delete (inalterado) ---------- */
  const handleVote = async (postId: string, voteType: "heart" | "bomb") => {
    try {
      const existing = posts?.find((p: any) => p.id === postId)?.post_votes?.find((v: any) => v.user_id === user?.id);
      if (existing) {
        if (existing.vote_type === voteType) {
          const { error } = await supabase.from("post_votes").delete().match({ post_id: postId, user_id: user?.id });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("post_votes").update({ vote_type: voteType }).match({ post_id: postId, user_id: user?.id });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("post_votes").insert({ post_id: postId, user_id: user?.id, vote_type: voteType });
        if (error) throw error;
      }
      refetch();
    } catch {
      toast({ variant: "destructive", title: "Erro ao votar", description: "Você precisa ser amigo do autor para votar." });
    }
  };

  const handleLike = async (postId: string, hasLiked: boolean) => {
    try {
      if (hasLiked) {
        const { error } = await supabase.from("likes").delete().match({ post_id: postId, user_id: user?.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
        if (error) throw error;
      }
      refetch();
    } catch {
      toast({ variant: "destructive", title: "Erro ao curtir", description: "Você precisa ser amigo do autor para curtir." });
    }
  };

  const {
    data: openPostComments, refetch: refetchComments, isLoading: loadingComments
  } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id],
    enabled: !!openingCommentsFor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id, post_id, user_id, content, created_at,
          author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)
        `)
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
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Erro ao comentar",
        description: e?.message ?? "Verifique as políticas RLS.",
      }),
  });

  const openEdit = (post: PostRow) => { setEditingPost(post); setEditContent(post.content || ""); };
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingPost) return;
      const { error } = await supabase
        .from("posts")
        .update({ content: editContent, updated_at: new Date().toISOString() })
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
        description: e?.message ?? "Tente novamente.",
      }),
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
      toast({ title: "Post excluído." });
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });
    },
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: e?.message ?? "Tente novamente.",
      }),
  });

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Logo Centralizada */}
        <div className="flex justify-center">
          <img 
            src="https://sistemaapp.netlify.app/assets/logo-wTbWaudN.png" 
            alt="Logo" 
            className="w-48 h-48 md:w-56 md:h-56 object-contain"
          />
        </div>
    
        

        {/* Composer */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-sm">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-inner">
                  {user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <MentionTextarea
                  placeholder="O que você está pensando? Use @ para mencionar alguém"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[80px] resize-none border-0 bg-muted/50 shadow-inner focus:bg-background/50 transition-all duration-300 rounded-xl"
                />

                {mediaFiles.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-lg group-hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-border/50">
                          {file.type.startsWith("image/") ? (
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt="Preview" 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video 
                                src={URL.createObjectURL(file)} 
                                className="w-full h-full object-cover"
                                muted 
                                playsInline 
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <div className="bg-black/50 rounded-full p-1.5 shadow-lg">
                                  <Play className="h-4 w-4 text-white fill-white" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="destructive" 
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inputs nativos escondidos */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => onFilesPicked(e.target.files)}
                />
                <input
                  ref={cameraPhotoInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => onFilesPicked(e.target.files)}
                />
                <input
                  ref={cameraVideoInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*"
                  capture="environment"
                  onChange={(e) => onFilesPicked(e.target.files)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300 shadow-sm"
                      onClick={() => galleryInputRef.current?.click()}
                      aria-label="Abrir galeria"
                    >
                      <Images className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300 shadow-sm"
                      onClick={() => cameraPhotoInputRef.current?.click()}
                      aria-label="Abrir câmera (foto)"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300 shadow-sm"
                      onClick={() => cameraVideoInputRef.current?.click()}
                      aria-label="Abrir câmera (vídeo)"
                    >
                      <Video className="h-5 w-5" />
                    </Button>

                    {(processing) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                        <RotateCcw className="h-3 w-3 animate-spin" /> processando mídia…
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={handleCreatePost}
                    disabled={(!newPost.trim() && mediaFiles.length === 0) || uploading}
                    className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 rounded-xl font-semibold"
                  >
                    {uploading ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
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

          return (
            <Card key={post.id} className={cn(
              "border-0 shadow-lg bg-gradient-to-br from-card to-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-500",
              post.is_community_approved && "ring-1 ring-primary/30 shadow-primary/10"
            )}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="ring-2 ring-primary/20 shadow-sm">
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-inner">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <UserLink userId={post.user_id} username={post.profiles?.username || ""}>
                        {post.profiles?.username}
                      </UserLink>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(post.created_at)}</p>
                    </div>
                  </div>

                  {isOwnPost && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl">
                        <DropdownMenuItem 
                          onClick={() => { setEditingPost(post); setEditContent(post.content || ""); }}
                          className="rounded-lg cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Editar postagem
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(post.id)}
                          className="text-red-600 focus:text-red-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir postagem
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {post.is_community_approved && (
                  <Badge className="mb-2 bg-gradient-to-r from-primary to-secondary shadow-sm border-0">
                    ✓ Aprovado pela Comunidade
                  </Badge>
                )}

                <p className="text-foreground leading-relaxed">
                  <MentionText text={post.content ?? ""} />
                </p>

                {mediaList.length > 0 && (
                  <div className={cn(
                    "grid gap-3 mt-3",
                    mediaList.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {mediaList.map((raw: string, index: number) => {
                      const url = stripPrefix(raw);
                      const isVideo = isVideoUrl(raw);
                      return (
                        <button
                          key={index}
                          className="rounded-xl overflow-hidden group relative bg-gradient-to-br from-muted to-muted/50 shadow-lg hover:shadow-xl transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          onClick={() => { setViewerUrl(url); setViewerIsVideo(isVideo); setViewerOpen(true); }}
                        >
                          {isVideo ? (
                            <div className="relative w-full aspect-square">
                              <video 
                                src={url} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                playsInline 
                                preload="metadata"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                                <div className="bg-black/60 rounded-full p-3 shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                                  <Play className="h-6 w-6 text-white fill-white" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full aspect-square">
                              <img 
                                src={url} 
                                alt="Post media" 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                              />
                            </div>
                          )}
                          <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-lg flex items-center gap-1">
                            <Maximize2 className="h-3 w-3" />
                            Expandir
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isVotingActive && (
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-4 space-y-3 shadow-inner border border-border/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {(() => {
                          const now = new Date().getTime();
                          const end = new Date(post.voting_ends_at).getTime();
                          const diff = end - now;
                          if (diff <= 0) return "Votação encerrada";
                          const m = Math.floor(diff / 60000);
                          const h = Math.floor(m / 60);
                          const mm = m % 60;
                          return `${h}h ${mm}m restantes`;
                        })()}
                      </span>
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full shadow-sm">
                          <Heart className="h-3 w-3 fill-red-500 text-red-500" /> {heartVotes}
                        </span>
                        <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full shadow-sm">
                          <Bomb className="h-3 w-3 fill-orange-500 text-orange-500" /> {bombVotes}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "flex-1 rounded-xl transition-all duration-300 shadow-sm",
                          userVote?.vote_type === "heart" 
                            ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-green-200" 
                            : "hover:bg-green-50 hover:border-green-200"
                        )}
                        onClick={() => handleVote(post.id, "heart")}
                      >
                        <Heart className={cn("h-4 w-4 mr-2", userVote?.vote_type === "heart" && "fill-green-600 text-green-600")} />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "flex-1 rounded-xl transition-all duration-300 shadow-sm",
                          userVote?.vote_type === "bomb" 
                            ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 shadow-red-200" 
                            : "hover:bg-red-50 hover:border-red-200"
                        )}
                        onClick={() => handleVote(post.id, "bomb")}
                      >
                        <Bomb className={cn("h-4 w-4 mr-2", userVote?.vote_type === "bomb" && "fill-red-600 text-red-600")} />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-border/20">
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleLike(post.id, hasLiked)}
                    className={cn(
                      "rounded-xl transition-all duration-300",
                      hasLiked 
                        ? "text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 shadow-sm" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Heart className={cn("h-5 w-5 mr-2 transition-all", hasLiked && "fill-current scale-110")} />
                    {likesCount}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setOpeningCommentsFor(post)}
                    className="rounded-xl hover:bg-muted transition-all duration-300"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    {commentsCount}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="rounded-xl hover:bg-muted transition-all duration-300"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Compartilhar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto rounded-xl hover:bg-muted transition-all duration-300"
                  >
                    <Bookmark className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {posts?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum post ainda. Seja o primeiro a publicar!</p>
          </div>
        )}
      </div>

      {/* Viewer full-screen */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-0 shadow-2xl">
          <div className="relative">
            <Button
              variant="secondary" 
              size="icon"
              className="absolute right-4 top-4 z-50 bg-black/50 hover:bg-black/70 text-white border-0 rounded-xl shadow-lg hover:scale-110 transition-all duration-300"
              onClick={() => setViewerOpen(false)} 
              aria-label="Fechar"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <div className="w-full h-[80vh] flex items-center justify-center">
              {viewerUrl &&
                (viewerIsVideo ? (
                  <video 
                    src={viewerUrl} 
                    controls 
                    playsInline 
                    className="max-h-full max-w-full rounded-lg shadow-2xl" 
                    preload="metadata"
                    autoPlay
                  />
                ) : (
                  <img 
                    src={viewerUrl} 
                    alt="Mídia" 
                    className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl" 
                  />
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editingPost} onOpenChange={(o) => !o && setEditingPost(null)}>
        <DialogContent className="max-w-lg rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle>Editar postagem</DialogTitle></DialogHeader>
          <Textarea 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)} 
            rows={8} 
            placeholder="Edite o conteúdo da postagem" 
            className="rounded-xl border-border/50 focus:border-primary/50 transition-colors"
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingPost(null)}
              className="rounded-xl border-border/50 hover:border-primary/50 transition-colors"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => editMutation.mutate()}
              className="rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg transition-all duration-300"
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comentários */}
      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => { if (!o) setOpeningCommentsFor(null); }}>
        <DialogContent className="max-w-xl rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle>Comentários</DialogTitle></DialogHeader>
          <div className="max-h-[50vh] overflow-auto space-y-4 pr-1">
            {loadingComments ? (
              <p className="text-sm text-muted-foreground">Carregando comentários...</p>
            ) : (openPostComments?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Seja o primeiro a comentar!</p>
            ) : (
              openPostComments!.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 group">
                  <Avatar className="h-8 w-8 ring-1 ring-primary/20 shadow-sm">
                    <AvatarImage src={c.author?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs">
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
                      <span className="text-xs text-muted-foreground">{fmtDateTime(c.created_at)}</span>
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
    </div>
  );
}