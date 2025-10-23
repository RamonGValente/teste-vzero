import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  Image as ImageIcon,
  Bomb,
  Upload,
  X,
  Pencil,
  Trash2,
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

// shadcn/ui
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type PostRow = any;

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [postTitle, setPostTitle] = useState("");
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- STATES para Editar/Comentários ----
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openingCommentsFor, setOpeningCommentsFor] = useState<PostRow | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Mark feed as viewed when user visits
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

      // Get user's friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id);

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

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_votes" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Process expired posts every minute
  useEffect(() => {
    const processVotes = async () => {
      try {
        await supabase.functions.invoke("process-votes");
      } catch (error) {
        console.error("Error processing votes:", error);
      }
    };
    processVotes();
    const interval = setInterval(processVotes, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (validFiles.length !== files.length) {
      toast({
        variant: "destructive",
        title: "Arquivos inválidos",
        description: "Apenas imagens e vídeos são permitidos.",
      });
    }

    setMediaFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() && !newPost.trim() && mediaFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Adicione um título ou conteúdo para publicar.",
      });
      return;
    }

    setUploading(true);
    try {
      const mediaUrls: string[] = [];

      // Upload media files
      for (const file of mediaFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath);

        mediaUrls.push(publicUrl);
      }

      // Create post with 1 hour voting period
      const votingEndsAt = new Date();
      votingEndsAt.setHours(votingEndsAt.getHours() + 1);

      const postContent = postTitle.trim()
        ? `${postTitle}\n\n${newPost}`
        : newPost;

      const { data: postData, error } = await supabase
        .from("posts")
        .insert({
          user_id: user?.id,
          content: postContent,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          voting_ends_at: votingEndsAt.toISOString(),
          voting_period_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Save mentions
      if (postData && user) {
        const { saveMentions } = await import("@/utils/mentionsHelper");
        await saveMentions(postData.id, "post", postContent, user.id);
      }

      toast({
        title: "Post criado!",
        description: "Sua postagem entrará em votação por 1 hora.",
      });

      setPostTitle("");
      setNewPost("");
      setMediaFiles([]);
      refetch();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o post.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (postId: string, voteType: "heart" | "bomb") => {
    try {
      const existingVote = posts
        ?.find((p) => p.id === postId)
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
    } catch (error) {
      console.error("Erro ao votar:", error);
      toast({
        variant: "destructive",
        title: "Erro ao votar",
        description:
          "Você precisa ser amigo do autor para votar nesta publicação.",
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
    } catch (error) {
      console.error("Erro ao curtir:", error);
      toast({
        variant: "destructive",
        title: "Erro ao curtir",
        description:
          "Você precisa ser amigo do autor para curtir esta publicação.",
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

  // ---------------- EDITAR POST ----------------
  const openEdit = (post: PostRow) => {
    setEditingPost(post);
    setEditContent(post.content || "");
  };
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
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: e?.message ?? "Tente novamente.",
      });
    },
  });

  // ---------------- EXCLUIR POST ----------------
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Ordem segura para evitar FK: comments -> likes -> post_votes -> posts
      const tasks = [
        supabase.from("comments").delete().eq("post_id", postId),
        supabase.from("likes").delete().eq("post_id", postId),
        supabase.from("post_votes").delete().eq("post_id", postId),
      ];
      for (const t of tasks) {
        const { error } = await t;
        if (error) throw error;
      }
      const { error: delPostError } = await supabase.from("posts").delete().eq("id", postId);
      if (delPostError) throw delPostError;
    },
    onSuccess: () => {
      toast({ title: "Post excluído." });
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id] });
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: e?.message ?? "Tente novamente.",
      });
    },
  });

  // ---------------- COMENTÁRIOS ----------------
  // Busca comentários do post aberto (lazy, habilita quando abrir)
  const { data: openPostComments, refetch: refetchComments, isLoading: loadingComments } = useQuery({
    queryKey: ["post-comments", openingCommentsFor?.id],
    enabled: !!openingCommentsFor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          id,
          post_id,
          user_id,
          content,
          created_at,
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
        user_id: user.id,
        content: newCommentText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNewCommentText("");
      await Promise.all([
        refetchComments(),
        queryClient.invalidateQueries({ queryKey: ["posts", user?.id] }), // atualiza contador
      ]);
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao comentar",
        description: e?.message ?? "Tente novamente.",
      });
    },
  });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Create Post */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email?.[0].toUpperCase()}
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
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
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

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Adicionar mídia
                    </Button>
                  </div>
                  <Button
                    onClick={handleCreatePost}
                    disabled={
                      (!postTitle.trim() && !newPost.trim() && mediaFiles.length === 0) || uploading
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

        {/* Posts Feed */}
        {posts?.map((post) => {
          const isOwnPost = post.user_id === user?.id;
          const hasLiked = post.likes?.some((like: any) => like.user_id === user?.id);
          const likesCount = post.likes?.length || 0;
          const commentsCount = post.comments?.length || 0;

          const heartVotes =
            post.post_votes?.filter((v: any) => v.vote_type === "heart").length || 0;
          const bombVotes =
            post.post_votes?.filter((v: any) => v.vote_type === "bomb").length || 0;
          const userVote = post.post_votes?.find((v: any) => v.user_id === user?.id);
          const isVotingActive = post.voting_period_active && post.voting_ends_at;

          return (
            <Card
              key={post.id}
              className={cn(
                "border shadow-sm bg-card hover:shadow-md transition-shadow",
                post.is_community_approved && "border-primary/50"
              )}
            >
              <CardContent className="pt-6 space-y-4">
                {/* Post Header */}
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
                        {fmtDate(post.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* ⋮ apenas para o dono do post */}
                  {isOwnPost && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Opções da postagem">
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

                {/* Selo aprovado */}
                {post.is_community_approved && (
                  <Badge className="mb-2 bg-gradient-to-r from-primary to-secondary">
                    ✓ Aprovado pela Comunidade
                  </Badge>
                )}

                {/* Conteúdo */}
                <p className="text-foreground leading-relaxed">
                  <MentionText text={post.content ?? ""} />
                </p>

                {/* Media */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {post.media_urls.map((url: string, index: number) => (
                      <div key={index} className="rounded-lg overflow-hidden">
                        {url.includes("video") ? (
                          <video src={url} controls className="w-full" />
                        ) : (
                          <img src={url} alt="Post media" className="w-full h-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Votação */}
                {isVotingActive && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {getTimeRemaining(post.voting_ends_at)}
                      </span>
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                          {heartVotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bomb className="h-3 w-3 fill-orange-500 text-orange-500" />
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

                {/* Ações */}
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

                  {/* Comentários: contador + abrir dialog com lista e input */}
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

      {/* ------------ DIALOG EDITAR POST ------------ */}
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

      {/* ------------ DIALOG COMENTÁRIOS ------------ */}
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

          {/* Lista de comentários */}
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
                        {fmtDate(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Novo comentário */}
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
    </div>
  );
}
