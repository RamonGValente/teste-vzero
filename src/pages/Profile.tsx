import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Settings,
  UserPlus,
  UserMinus,
  Calendar,
  Copy,
  Check,
  Heart,
  Bomb,
  MessageCircle,
  Bookmark,
  MoreVertical,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Video,
  Image,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MovementStatusToggle } from "@/components/movement/MovementStatusToggle";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { sendPushEvent } from "@/utils/pushClient";

type MiniProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

// ===== UTILS FUNCTIONS =====
const MEDIA_PREFIX = { image: "image::", video: "video::", audio: "audio::" } as const;

const isVideoUrl = (u: any): boolean => {
  if (!u || typeof u !== 'string') return false;
  return u.startsWith(MEDIA_PREFIX.video) || /\.(mp4|webm|ogg|mov|m4v)$/i.test(u.split("::").pop() || u);
};

const isAudioUrl = (u: any): boolean => {
  if (!u || typeof u !== 'string') return false;
  return u.startsWith(MEDIA_PREFIX.audio) || /\.(mp3|wav|ogg|m4a)$/i.test(u.split("::").pop() || u);
};

const stripPrefix = (u: any): string => {
  if (!u) return '';
  if (typeof u !== 'string') {
    try {
      u = String(u);
    } catch {
      return '';
    }
  }
  return u.replace(/^image::|^video::|^audio::/, "");
};

const fmtDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } catch {
    return iso;
  }
};

const ensureMediaUrlsArray = (mediaUrls: any): string[] => {
  if (!mediaUrls) return [];
  if (Array.isArray(mediaUrls)) {
    return mediaUrls.filter((url): url is string => 
      typeof url === 'string' && url.trim() !== ''
    );
  }
  return [];
};

// ===== VIDEO PLAYER COMPONENT =====
const VideoPlayer = ({ src, className, onClick }: { src: string; className?: string; onClick?: () => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
    onClick?.();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <div className={cn("relative bg-black aspect-square group", className)}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onEnded={() => setIsPlaying(false)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={toggleMute}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===== POST ITEM COMPONENT =====
const PostItem = ({ post, user, onLike, onDelete, onEdit }: any) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);

  const isLiked = post.likes?.some((like: any) => like.user_id === user?.id);
  const isVoting = post.voting_period_active;
  const heartCount = post.post_votes?.filter((v: any) => v.vote_type === 'heart').length || 0;
  const bombCount = post.post_votes?.filter((v: any) => v.vote_type === 'bomb').length || 0;
  const totalVotes = heartCount + bombCount;
  const approvalRate = totalVotes > 0 ? (heartCount / totalVotes) * 100 : 50;

  const mediaUrls = ensureMediaUrlsArray(post.media_urls);

  const handleMediaClick = (url: string) => {
    const cleanUrl = stripPrefix(url);
    if (isVideoUrl(url)) {
      setViewerIsVideo(true);
      setViewerUrl(cleanUrl);
    } else {
      setViewerIsVideo(false);
      setViewerUrl(cleanUrl);
    }
    setViewerOpen(true);
  };

  return (
    <>
      <Card key={post.id} className={cn("border-0 shadow-md overflow-hidden transition-all", isVoting ? "ring-2 ring-orange-400/50" : "hover:shadow-lg")}>
        <CardContent className="p-0">
          {/* Cabeçalho do Post */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>{post.profiles?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm hover:underline">{post.profiles?.username}</span>
                  {isVoting && (
                    <Badge variant="secondary" className="text-[10px] h-4 bg-orange-100 text-orange-700">
                      Em Votação
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{fmtDateTime(post.created_at)}</p>
              </div>
            </div>
            {post.user_id === user?.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(post)}>
                    <Settings className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-red-600">
                    <MoreVertical className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Conteúdo do Post */}
          {post.content && (
            <div className="px-4 pb-3 text-sm">
              {post.content}
            </div>
          )}

          {/* Mídias do Post */}
          {mediaUrls.length > 0 && (
            <div className={cn("grid gap-0.5", mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {mediaUrls.map((u: string, i: number) => {
                const url = stripPrefix(u);
                if (isVideoUrl(u)) {
                  return (
                    <VideoPlayer
                      key={i}
                      src={url}
                      className="aspect-square cursor-pointer"
                      onClick={() => handleMediaClick(u)}
                    />
                  );
                }
                return (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden bg-muted cursor-pointer group"
                    onClick={() => handleMediaClick(u)}
                  >
                    <img
                      src={url}
                      alt="Post media"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error("Erro ao carregar imagem:", e);
                        e.currentTarget.src = 'https://placehold.co/400x400?text=Imagem+Indisponível';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Área de Interações */}
          <div className="p-3 flex items-center gap-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(post.id)}
              className={cn(
                "rounded-full transition-colors",
                isLiked && "text-red-500 bg-red-50"
              )}
            >
              <Heart className={cn("h-5 w-5 mr-1", isLiked && "fill-current")} />
              {post.likes?.length || 0}
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full">
              <MessageCircle className="h-5 w-5 mr-1" />
              {post.comments?.length || 0}
            </Button>
            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bookmark className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para visualizar mídia */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-0">
          <div className="relative h-[80vh] flex items-center justify-center">
            {viewerIsVideo ? (
              <video
                src={viewerUrl || ""}
                className="max-h-full max-w-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <img
                src={viewerUrl || ""}
                className="max-h-full max-w-full object-contain"
                alt="Visualização ampliada"
                onError={(e) => {
                  e.currentTarget.src = 'https://placehold.co/800x800?text=Imagem+Indisponível';
                }}
              />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 rounded-full"
              onClick={() => setViewerOpen(false)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ===== MAIN PROFILE COMPONENT =====
export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ username: "", full_name: "", bio: "" });
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editPostContent, setEditPostContent] = useState("");

  const profileId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  // ===== Header/Avatar =====
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const [coverH, setCoverH] = useState<number | null>(null);
  useEffect(() => {
    const recalc = () => setCoverH(avatarRef.current?.offsetHeight ?? 0);
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  // ===== Queries =====
  const { data: profile } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      
      if (error) throw error;

      if (isOwnProfile) {
        setEditData({
          username: data.username || "",
          full_name: data.full_name || "",
          bio: data.bio || "",
        });
      }
      return data;
    },
    enabled: !!profileId,
  });

  // Query para posts do usuário
  const { data: userPosts } = useQuery({
    queryKey: ["userPosts", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url, full_name),
          likes (id, user_id),
          comments (id),
          post_votes (id, user_id, vote_type)
        `)
        .eq("user_id", profileId)
        .eq("is_community_approved", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Processar media_urls para garantir que seja um array válido
      return (data || []).map(post => ({
        ...post,
        media_urls: ensureMediaUrlsArray(post.media_urls)
      }));
    },
    enabled: !!profileId,
  });

  // Query para mídias do usuário
  const { data: userMedia } = useQuery({
    queryKey: ["userMedia", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url, full_name),
          likes (id, user_id),
          comments (id)
        `)
        .eq("user_id", profileId)
        .eq("is_community_approved", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Filtrar posts que têm mídias e processar media_urls
      return (data || [])
        .filter(post => {
          const urls = ensureMediaUrlsArray(post.media_urls);
          return urls.length > 0;
        })
        .map(post => ({
          ...post,
          media_urls: ensureMediaUrlsArray(post.media_urls)
        }));
    },
    enabled: !!profileId,
  });

  // Query para posts curtidos pelo usuário
  const { data: likedPosts } = useQuery({
    queryKey: ["likedPosts", profileId],
    queryFn: async () => {
      if (!profileId) return [];

      // Primeiro, pega os IDs dos posts que o usuário curtiu
      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", profileId);

      if (likesError) throw likesError;

      if (!likesData || likesData.length === 0) return [];

      const postIds = likesData.map(like => like.post_id);

      // Agora busca os posts completos
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url, full_name),
          likes (id, user_id),
          comments (id),
          post_votes (id, user_id, vote_type)
        `)
        .in("id", postIds)
        .eq("is_community_approved", true)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      
      // Processar media_urls
      return (postsData || []).map(post => ({
        ...post,
        media_urls: ensureMediaUrlsArray(post.media_urls)
      }));
    },
    enabled: !!profileId,
  });

  const { data: stats } = useQuery({
    queryKey: ["profileStats", profileId],
    queryFn: async () => {
      const [postsCount, followersCount, followingCount] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact" }).eq("user_id", profileId),
        supabase.from("followers").select("id", { count: "exact" }).eq("following_id", profileId),
        supabase.from("followers").select("id", { count: "exact" }).eq("follower_id", profileId),
      ]);
      return {
        posts: postsCount.count || 0,
        followers: followersCount.count || 0,
        following: followingCount.count || 0,
      };
    },
    enabled: !!profileId,
  });

  // ===== Contadores persistidos: aprovadas/removidas =====
  const { data: moderationStats } = useQuery({
    queryKey: ["profileModerationStats", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_moderation_stats")
        .select("approved_count, removed_count")
        .eq("user_id", profileId)
        .maybeSingle();
      if (error) throw error;
      return {
        approved: data?.approved_count ?? 0,
        removed: data?.removed_count ?? 0,
      };
    },
    enabled: !!profileId,
  });

  // ===== Follow state =====
  const { data: isFollowing } = useQuery({
    queryKey: ["isFollowing", profileId, user?.id],
    queryFn: async () => {
      if (!user?.id || !profileId || isOwnProfile) return false;
      const { data, error } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profileId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!profileId && !isOwnProfile,
  });

  // ===== Friendship state =====
  const { data: isFriend } = useQuery({
    queryKey: ["isFriend", user?.id, profileId],
    queryFn: async () => {
      if (!user?.id || !profileId || user?.id === profileId) return false;
      const { data, error } = await supabase
        .from("friendships")
        .select("id")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${user.id})`
        )
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!profileId && user?.id !== profileId,
  });

  const { data: pendingBetween } = useQuery({
    queryKey: ["pendingFriendRequestBetween", user?.id, profileId],
    queryFn: async () => {
      if (!user?.id || !profileId || user?.id === profileId) return null;
      const { data, error } = await supabase
        .from("friend_requests")
        .select("id,sender_id,receiver_id,status")
        .eq("status", "pending")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${user.id})`
        )
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!user?.id && !!profileId && user?.id !== profileId,
  });

  // ===== Follow actions =====
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profileId) return;
      if (isFollowing) {
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("followers")
          .insert({ follower_id: user.id, following_id: profileId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", profileId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profileStats", profileId] });
      toast({
        title: isFollowing ? "Deixou de seguir" : "Seguindo!",
        description: isFollowing
          ? `Você não segue mais @${profile?.username}`
          : `Agora você segue @${profile?.username}`,
      });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: typeof editData) => {
      const { error } = await supabase.from("profiles").update(data).eq("id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
      toast({ title: "Perfil atualizado!", description: "Suas alterações foram salvas." });
    },
  });

  // ===== Avatar upload =====
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) return;
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível fazer upload da imagem." });
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);

    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast({ title: "Foto atualizada!", description: "Sua foto de perfil foi alterada." });
  };

  // ===== Amizade: adicionar/aceitar (com RPC) =====
  const addOrAcceptFriend = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profileId || user.id === profileId) throw new Error("Operação inválida.");

      const { data: already, error: fErr } = await supabase
        .from("friendships")
        .select("id")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${user.id})`
        )
        .maybeSingle();
      if (fErr) throw fErr;
      if (already) return { action: "already-friends" as const };

      const { data: pending, error: pErr } = await supabase
        .from("friend_requests")
        .select("id,sender_id,receiver_id,status")
        .eq("status", "pending")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${user.id})`
        )
        .maybeSingle();
      if (pErr) throw pErr;

      if (pending && pending.sender_id === profileId && pending.receiver_id === user.id) {
        const { error: rpcErr } = await supabase.rpc("create_friendship_pair", { a: user.id, b: profileId });
        if (rpcErr) {
          const { error: ins1 } = await supabase
            .from("friendships")
            .insert({ user_id: user.id, friend_id: profileId });
          if (ins1) throw rpcErr;
        }

        const { error: upd } = await supabase
          .from("friend_requests")
          .update({ status: "accepted" })
          .eq("id", pending.id);
        if (upd) throw upd;

        return { action: "accepted" as const };
      }

      if (pending && pending.sender_id === user.id && pending.receiver_id === profileId) {
        return { action: "already-pending" as const };
      }

      const { data: fr, error: reqErr } = await supabase
        .from("friend_requests")
        .insert({
          sender_id: user.id,
          receiver_id: profileId,
          status: "pending",
        })
        .select('id')
        .single();
      if (reqErr) throw reqErr;

      // Push: pedido de amizade
      try {
        if (fr?.id) {
          void sendPushEvent({ eventType: 'friend_request', friendRequestId: fr.id });
        }
      } catch (e) {
        console.warn('Falha ao disparar push de pedido de amizade', e);
      }

      return { action: "requested" as const };
    },
    onSuccess: ({ action }) => {
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequestBetween", user?.id, profileId] });
      queryClient.invalidateQueries({ queryKey: ["isFriend", user?.id, profileId] });

      if (action === "accepted") {
        toast({ title: "Amizade confirmada!", description: "Vocês agora são amigos." });
      } else if (action === "already-pending") {
        toast({ title: "Solicitação já enviada", description: "Aguarde a confirmação do usuário." });
      } else if (action === "requested") {
        toast({ title: "Solicitação enviada!", description: "O usuário foi notificado." });
      } else if (action === "already-friends") {
        toast({ title: "Vocês já são amigos", description: "Nada a fazer por aqui." });
      }
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Não foi possível enviar a solicitação",
        description: err?.message ?? "Tente novamente.",
      });
    },
  });

  // ===== Remover amigo (com RPC) =====
  const removeFriend = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profileId) throw new Error("Operação inválida.");
      const { error: rpcErr } = await supabase.rpc("remove_friendship_pair", { a: user.id, b: profileId });
      if (rpcErr) {
        const { error: del1 } = await supabase
          .from("friendships")
          .delete()
          .eq("user_id", user.id)
          .eq("friend_id", profileId);
        if (del1) throw rpcErr;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["isFriend", user?.id, profileId] }),
        queryClient.invalidateQueries({ queryKey: ["pendingFriendRequestBetween", user?.id, profileId] }),
      ]);
      toast({ title: "Amizade removida", description: "Vocês não são mais amigos." });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Não foi possível remover",
        description: err?.message ?? "Tente novamente.",
      });
    },
  });

  // ===== Followers / Following MODALS =====
  const [openFollowers, setOpenFollowers] = useState(false);
  const [openFollowing, setOpenFollowing] = useState(false);

  const { data: followersList, isLoading: loadingFollowers } = useQuery({
    queryKey: ["followersList", profileId, openFollowers],
    enabled: !!profileId && openFollowers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followers")
        .select(
          "follower:profiles!followers_follower_id_fkey(id, username, full_name, avatar_url)"
        )
        .eq("following_id", profileId);
      if (error) throw error;
      const list: MiniProfile[] = (data || [])
        .map((r: any) => r.follower)
        .filter(Boolean);
      return list.sort((a, b) => a.username.localeCompare(b.username));
    },
  });

  const { data: followingList, isLoading: loadingFollowing } = useQuery({
    queryKey: ["followingList", profileId, openFollowing],
    enabled: !!profileId && openFollowing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followers")
        .select(
          "following:profiles!followers_following_id_fkey(id, username, full_name, avatar_url)"
        )
        .eq("follower_id", profileId);
      if (error) throw error;
      const list: MiniProfile[] = (data || [])
        .map((r: any) => r.following)
        .filter(Boolean);
      return list.sort((a, b) => a.username.localeCompare(b.username));
    },
  });

  // Navegar para perfil ao clicar num usuário da lista
  const goToProfile = (id: string) => {
    setOpenFollowers(false);
    setOpenFollowing(false);
    navigate(`/profile/${id}`);
  };

  // ===== Opcional: copiar UDG do próprio perfil =====
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!profile?.friend_code) return;
    try {
      await navigator.clipboard.writeText(profile.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { }
  };

  // ===== Ações nos posts =====
  const handleLike = async (postId: string) => {
    try {
      const allPosts = [...(userPosts || []), ...(likedPosts || []), ...(userMedia || [])];
      const post = allPosts.find(p => p.id === postId);
      const has = post?.likes?.find((l: any) => l.user_id === user?.id);
      
      if (has) {
        await supabase.from("likes").delete().match({ id: has.id });
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
      }
      
      // Invalida todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["userPosts", profileId] });
      queryClient.invalidateQueries({ queryKey: ["userMedia", profileId] });
      queryClient.invalidateQueries({ queryKey: ["likedPosts", profileId] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao curtir",
        description: "Não foi possível processar sua ação."
      });
    }
  };

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Post excluído" });
      // Invalida todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["userPosts", profileId] });
      queryClient.invalidateQueries({ queryKey: ["userMedia", profileId] });
      queryClient.invalidateQueries({ queryKey: ["likedPosts", profileId] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Não foi possível excluir o post."
      });
    }
  });

  const updatePost = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase
        .from("posts")
        .update({ content })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Post atualizado" });
      setEditingPost(null);
      setEditPostContent("");
      // Invalida todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["userPosts", profileId] });
      queryClient.invalidateQueries({ queryKey: ["userMedia", profileId] });
      queryClient.invalidateQueries({ queryKey: ["likedPosts", profileId] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o post."
      });
    }
  });

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setEditPostContent(post.content || "");
  };

  // ===== Renderização da aba de mídia =====
  const renderMediaTab = () => {
    if (!userMedia || userMedia.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma mídia ainda</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userMedia.flatMap((post: any) => {
          const mediaUrls = ensureMediaUrlsArray(post.media_urls);
          return mediaUrls.map((mediaUrl: string, index: number) => {
            const url = stripPrefix(mediaUrl);
            const isVideo = isVideoUrl(mediaUrl);
            
            return (
              <div
                key={`${post.id}-${index}`}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer group"
                onClick={() => {
                  if (isVideo) {
                    setViewerUrl(url);
                    setViewerIsVideo(true);
                    setViewerOpen(true);
                  } else {
                    setViewerUrl(url);
                    setViewerIsVideo(false);
                    setViewerOpen(true);
                  }
                }}
              >
                {isVideo ? (
                  <>
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-12 w-12 text-white/80" />
                    </div>
                    <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                      <Video className="h-4 w-4 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={url}
                      alt={`Mídia do post ${post.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error("Erro ao carregar imagem:", e);
                        e.currentTarget.src = 'https://placehold.co/400x400?text=Imagem+Indisponível';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                      <Image className="h-4 w-4 text-white" />
                    </div>
                  </>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post.id);
                    }}
                  >
                    <Heart className={cn("h-3 w-3", post.likes?.some((l: any) => l.user_id === user?.id) && "fill-current")} />
                  </Button>
                  <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                    {post.likes?.length || 0}
                  </span>
                </div>
              </div>
            );
          });
        })}
      </div>
    );
  };

  // Estados para viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* HEADER */}
      <div className="relative">
        <div className="bg-gradient-to-r from-primary via-secondary to-accent" style={{ height: coverH ?? 256 }} />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 transform">
          <div ref={avatarRef} className="relative">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                {profile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {isOwnProfile && (
              <label className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary text-white cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="mt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-2xl flex flex-col items-center space-y-4">
              {isEditing ? (
                <div className="space-y-4 bg-card p-4 rounded-lg border shadow-sm w-full">
                  <div className="space-y-2">
                    <Label>Nome de usuário</Label>
                    <Input value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea value={editData.bio} onChange={(e) => setEditData({ ...editData, bio: e.target.value })} rows={3} />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => updateProfile.mutate(editData)} className="bg-gradient-to-r from-primary to-secondary">Salvar</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h1 className="text-2xl md:text-3xl font-bold">{profile?.full_name || profile?.username}</h1>
                    <p className="text-muted-foreground">@{profile?.username}</p>

                    {isOwnProfile && profile?.friend_code && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm">
                        <span className="font-medium">Seu código UDG:</span>
                        <code className="font-mono">{profile.friend_code}</code>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy} title="Copiar código">
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>

                  {profile?.bio && <p className="text-foreground text-center max-w-xl">{profile.bio}</p>}

                  {/* Linha: posts / seguidores / seguindo (clickable em seguidores/seguindo) */}
                  <div className="flex gap-6 text-sm justify-center">
                    <div>
                      <span className="font-bold text-foreground">{stats?.posts || 0}</span>
                      <span className="text-muted-foreground ml-1">posts</span>
                    </div>

                    <button
                      className="group"
                      onClick={() => setOpenFollowers(true)}
                      title="Ver seguidores"
                    >
                      <span className="font-bold text-foreground group-hover:underline">
                        {stats?.followers || 0}
                      </span>
                      <span className="text-muted-foreground ml-1">seguidores</span>
                    </button>

                    <button
                      className="group"
                      onClick={() => setOpenFollowing(true)}
                      title="Ver seguindo"
                    >
                      <span className="font-bold text-foreground group-hover:underline">
                        {stats?.following || 0}
                      </span>
                      <span className="text-muted-foreground ml-1">seguindo</span>
                    </button>
                  </div>

                  {/* Aprovadas / Removidas */}
                  <div className="flex gap-6 text-sm justify-center mt-1">
                    <div className="inline-flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      <span className="font-bold text-foreground">
                        {moderationStats?.approved ?? 0}
                      </span>
                      <span className="text-muted-foreground">aprovadas</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Bomb className="h-4 w-4" />
                      <span className="font-bold text-foreground">
                        {moderationStats?.removed ?? 0}
                      </span>
                      <span className="text-muted-foreground">removidas</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-center w-full sm:w-auto mt-2">
                    {isOwnProfile ? (
                      <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full sm:w-auto">
                        <Settings className="h-4 w-4 mr-2" />
                        Editar Perfil
                      </Button>
                    ) : (
                      <>
                        {/* Seguir / Deixar de seguir */}
                        <Button
                          onClick={() => followMutation.mutate()}
                          disabled={followMutation.isPending}
                          variant={isFollowing ? "outline" : "default"}
                          className="w-full sm:w-auto"
                        >
                          {isFollowing ? (
                            <>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Deixar de seguir
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Seguir
                            </>
                          )}
                        </Button>

                        {/* Amizade */}
                        {isFriend ? (
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => removeFriend.mutate()}
                            disabled={removeFriend.isPending}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remover amigo
                          </Button>
                        ) : pendingBetween && pendingBetween.sender_id === user?.id ? (
                          <Button className="w-full sm:w-auto" disabled>
                            Solicitação enviada
                          </Button>
                        ) : (
                          <Button
                            className="w-full sm:w-auto"
                            onClick={() => addOrAcceptFriend.mutate()}
                            disabled={addOrAcceptFriend.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar como amigo
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <div className="mt-4 px-4">
            <MovementStatusToggle />
          </div>
        )}

        {/* TABS */}
        <Tabs defaultValue="posts" className="mt-8">
          <TabsList className="w-full justify-center border-b border-border/50 rounded-none bg-transparent p-0">
            <TabsTrigger value="posts" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Posts
            </TabsTrigger>
            <TabsTrigger value="media" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Mídia
            </TabsTrigger>
            <TabsTrigger value="likes" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Curtidas
            </TabsTrigger>
          </TabsList>

          {/* ABA: POSTS */}
          <TabsContent value="posts" className="mt-6 space-y-4">
            {userPosts?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum post ainda</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="space-y-4 pr-4">
                  {userPosts?.map((post: any) => (
                    <PostItem
                      key={post.id}
                      post={post}
                      user={user}
                      onLike={handleLike}
                      onDelete={deletePost.mutate}
                      onEdit={handleEditPost}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ABA: MÍDIA */}
          <TabsContent value="media" className="mt-6">
            {renderMediaTab()}
          </TabsContent>

          {/* ABA: CURTIDAS */}
          <TabsContent value="likes" className="mt-6 space-y-4">
            {likedPosts?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma curtida ainda</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="space-y-4 pr-4">
                  {likedPosts?.map((post: any) => (
                    <PostItem
                      key={post.id}
                      post={post}
                      user={user}
                      onLike={handleLike}
                      onDelete={deletePost.mutate}
                      onEdit={handleEditPost}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== Modais de Seguidores / Seguindo ===== */}
      <Dialog open={openFollowers} onOpenChange={setOpenFollowers}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seguidores</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {loadingFollowers ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (followersList?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum seguidor.</p>
            ) : (
              followersList!.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goToProfile(p.id)}
                  className="flex w-full items-center gap-3 rounded-md p-2 hover:bg-muted text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatar_url || ""} />
                    <AvatarFallback>{p.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.full_name || p.username}</div>
                    <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openFollowing} onOpenChange={setOpenFollowing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seguindo</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {loadingFollowing ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (followingList?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Não está seguindo ninguém.</p>
            ) : (
              followingList!.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goToProfile(p.id)}
                  className="flex w-full items-center gap-3 rounded-md p-2 hover:bg-muted text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatar_url || ""} />
                    <AvatarFallback>{p.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.full_name || p.username}</div>
                    <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edição de post */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Post</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editPostContent}
            onChange={(e) => setEditPostContent(e.target.value)}
            placeholder="Edite seu post..."
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingPost(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingPost) {
                  updatePost.mutate({ postId: editingPost.id, content: editPostContent });
                }
              }}
              disabled={updatePost.isPending}
            >
              {updatePost.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}