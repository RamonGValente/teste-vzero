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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/* ffmpeg.wasm */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

/* helpers */
const MEDIA_PREFIX = { image: "image::", video: "video::" } as const;
const isVideoUrl = (u: string) =>
  u.startsWith(MEDIA_PREFIX.video) ||
  /\.(mp4|webm|ogg|mov|m4v)$/i.test(u.split("::").pop() || u);
const stripPrefix = (u: string) => u.replace(/^image::|^video::/, "");
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

async function getDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => resolve(v.duration || 0);
      v.onerror = () => reject(new Error("Falha ao ler vídeo"));
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function validateVideoDuration(file: File, maxSeconds = 15) {
  if (!file.type.startsWith("video/")) return true;
  const dur = await getDuration(file).catch(() => 0);
  return dur > 0 && dur <= maxSeconds + 0.3;
}

/** compressão e corte para 15s com ffmpeg.wasm */
function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const ensure = async () => {
    if (ready) return;
    setLoading(true);
    const ff = new FFmpeg();
    const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist";
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ff;
    setReady(true);
    setLoading(false);
  };

  const compress = async (file: File): Promise<File> => {
    await ensure();
    const ff = ffmpegRef.current!;
    // nomes fixos
    const inName = "input";
    const outName = "output.webm";

    // escreve arquivo virtual
    await ff.writeFile(inName, await fetchFile(file));

    // -t 15 -> corta em 15s
    // -vf scale=720:-2 -> altura proporcional (até 720p)
    // libvpx-vp9 + libopus (formato webm) para melhor compatibilidade no navegador
    await ff.exec([
      "-i", inName,
      "-t", "15",
      "-vf", "scale='min(720,iw)':'-2':force_original_aspect_ratio=decrease",
      "-c:v", "libvpx-vp9",
      "-b:v", "1200k",
      "-c:a", "libopus",
      "-b:a", "96k",
      "-pix_fmt", "yuv420p",
      outName,
    ]);

    const data = await ff.readFile(outName);
    const blob = new Blob([data as Uint8Array], { type: "video/webm" });
    const nameBase = (file.name?.split(".")[0] || "video") + "-compressed.webm";
    return new File([blob], nameBase, { type: "video/webm" });
  };

  return { ready, loading, ensure, compress };
}

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
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);

  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);

  const [readingMeta, setReadingMeta] = useState(false);
  const { loading: ffLoading, compress } = useFFmpeg();

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

  useEffect(() => {
    const f = async () => { try { await supabase.functions.invoke("process-votes"); } catch {} };
    f();
    const i = setInterval(f, 60000);
    return () => clearInterval(i);
  }, []);

  /** Seleção de arquivos: aplica compressão para vídeos */
  const onFilesPicked = async (files?: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    setReadingMeta(true);
    const accepted: File[] = [];

    for (const f of list) {
      if (f.type.startsWith("video/")) {
        // valida duração e corta/comprime
        const ok = await validateVideoDuration(f, 15).catch(() => false);
        if (!ok) {
          // se vier >15s, tentamos cortar com ffmpeg; se ainda falhar, rejeita
          try {
            const trimmed = await compress(f);
            accepted.push(trimmed);
          } catch {
            // última checagem: calcular duração do recorte falhou => rejeita
            toast({
              variant: "destructive",
              title: "Vídeo muito longo",
              description: "Grave até 15s e tente novamente.",
            });
          }
        } else {
          // mesmo com <=15s, comprimimos para reduzir tamanho
          try {
            const small = await compress(f);
            accepted.push(small);
          } catch {
            // fallback: anexar original
            accepted.push(f);
          }
        }
      } else if (f.type.startsWith("image/")) {
        accepted.push(f);
      } else {
        toast({ variant: "destructive", title: "Arquivo inválido", description: "Apenas imagem ou vídeo." });
      }
    }

    setReadingMeta(false);
    if (accepted.length) setMediaFiles(prev => [...prev, ...accepted]);
  };

  const removeFile = (idx: number) =>
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));

  const handleCreatePost = async () => {
    if (!postTitle.trim() && !newPost.trim() && mediaFiles.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Adicione título, conteúdo ou mídia." });
      return;
    }
    setUploading(true);
    try {
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        // garante extensão
        const extFromType = file.type.startsWith("video/") ? "webm" :
                            (file.type.split("/")[1] || "png");
        const fileExt = (file.name.split(".").pop() || extFromType).toLowerCase();
        const fileName = `${user?.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || (fileExt === "webm" ? "video/webm" : undefined),
          });
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(filePath);
        mediaUrls.push((file.type.startsWith("video/") ? MEDIA_PREFIX.video : MEDIA_PREFIX.image) + publicUrl);
      }
      const votingEndsAt = new Date(); votingEndsAt.setHours(votingEndsAt.getHours() + 1);
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

      toast({ title: "Post criado!", description: "Sua postagem entrou no feed." });
      setPostTitle(""); setNewPost(""); setMediaFiles([]);
      refetch();
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao publicar", description: e?.message || "Falha ao criar post." });
    } finally {
      setUploading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Criador */}
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
                  <div className="flex flex-wrap gap-2">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {file.type.startsWith("image/") ? (
                            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted playsInline />
                          )}
                        </div>
                        <Button
                          variant="destructive" size="icon"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inputs nativos */}
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
                  multiple={false}
                  onChange={(e) => onFilesPicked(e.target.files)}
                />
                <input
                  ref={cameraVideoInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*"
                  capture="environment"
                  multiple={false}
                  onChange={(e) => onFilesPicked(e.target.files)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost" size="icon" className="text-muted-foreground"
                      onClick={() => galleryInputRef.current?.click()}
                      aria-label="Abrir galeria"
                    >
                      <Images className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost" size="icon" className="text-muted-foreground"
                      onClick={() => cameraPhotoInputRef.current?.click()}
                      aria-label="Abrir câmera (foto)"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost" size="icon" className="text-muted-foreground"
                      onClick={() => cameraVideoInputRef.current?.click()}
                      aria-label="Abrir câmera (vídeo)"
                    >
                      <Video className="h-5 w-5" />
                    </Button>

                    {(readingMeta || ffLoading) && (
                      <span className="text-xs text-muted-foreground">processando vídeo…</span>
                    )}
                  </div>

                  <Button
                    onClick={handleCreatePost}
                    disabled={(!postTitle.trim() && !newPost.trim() && mediaFiles.length === 0) || uploading}
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
            <Card key={post.id} className={cn("border shadow-sm bg-card hover:shadow-md transition-shadow",
              post.is_community_approved && "border-primary/50")}
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
                      <UserLink userId={post.user_id} username={post.profiles?.username || ""}>
                        {post.profiles?.username}
                      </UserLink>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(post.created_at)}</p>
                    </div>
                  </div>

                  {isOwnPost && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Opções da postagem">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => { setEditingPost(post); setEditContent(post.content || ""); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar postagem
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(post.id)}
                          className="text-red-600 focus:text-red-600"
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
                          onClick={() => { setViewerUrl(url); setViewerIsVideo(v); setViewerOpen(true); }}
                        >
                          {v ? (
                            <video src={url} className="w-full max-h-64 object-cover" controls playsInline preload="metadata" />
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
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3 fill-red-500 text-red-500" /> {heartVotes}</span>
                        <span className="flex items-center gap-1"><Bomb className="h-3 w-3 fill-orange-500 text-orange-500" /> {bombVotes}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm"
                        className={cn("flex-1", userVote?.vote_type === "heart" && "bg-red-500/10 border-red-500 text-red-500")}
                        onClick={() => handleVote(post.id, "heart")}
                      >
                        <Heart className={cn("h-4 w-4 mr-2", userVote?.vote_type === "heart" && "fill-current")} />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className={cn("flex-1", userVote?.vote_type === "bomb" && "bg-orange-500/10 border-orange-500 text-orange-500")}
                        onClick={() => handleVote(post.id, "bomb")}
                      >
                        <Bomb className={cn("h-4 w-4 mr-2", userVote?.vote_type === "bomb" && "fill-current")} />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleLike(post.id, hasLiked)}
                    className={hasLiked ? "text-red-500 hover:text-red-600" : ""}
                  >
                    <Heart className={cn("h-5 w-5 mr-2", hasLiked && "fill-current")} />
                    {likesCount}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setOpeningCommentsFor(post)}>
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
            <p className="text-muted-foreground">Nenhum post ainda. Seja o primeiro a publicar!</p>
          </div>
        )}
      </div>

      {/* Viewer full-screen */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-2 sm:p-4">
          <div className="relative">
            <Button
              variant="secondary" size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setViewerOpen(false)} aria-label="Fechar"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <div className="w-full h-full flex items-center justify-center">
              {viewerUrl &&
                (viewerIsVideo ? (
                  <video src={viewerUrl} controls playsInline className="max-h-[80vh] max-w-full rounded-lg" preload="metadata" />
                ) : (
                  <img src={viewerUrl} alt="Mídia" className="max-h-[80vh] max-w-full rounded-lg" />
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editingPost} onOpenChange={(o) => !o && setEditingPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar postagem</DialogTitle></DialogHeader>
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8} placeholder="Edite o conteúdo da postagem" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPost(null)}>Cancelar</Button>
            <Button onClick={() => editMutation.mutate()}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comentários */}
      <Dialog open={!!openingCommentsFor} onOpenChange={(o) => { if (!o) setOpeningCommentsFor(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Comentários</DialogTitle></DialogHeader>
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
                    <AvatarFallback>{c.author?.username?.[0]?.toUpperCase()}</AvatarFallback>
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
            <Textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Escreva um comentário…" rows={3} />
            <div className="flex justify-end">
              <Button onClick={() => addComment.mutate()} disabled={!newCommentText.trim() || !openingCommentsFor}>
                Comentar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
