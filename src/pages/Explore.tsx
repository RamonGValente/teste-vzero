import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, TrendingUp, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Componente VideoPlayer para controlar vídeos individualmente com autoplay baseado na visibilidade
interface VideoPlayerProps {
  src: string;
  className?: string;
  isSingle: boolean;
  videoId: string;
  registerVideo: (id: string, el: HTMLVideoElement) => void;
  unregisterVideo: (id: string) => void;
  playingVideo: string | null;
  muted: boolean;
  toggleMute: () => void;
  playVideo: (id: string) => void;
  pauseVideo: (id: string) => void;
}

const VideoPlayer = ({ 
  src, 
  className, 
  isSingle, 
  videoId, 
  registerVideo, 
  unregisterVideo, 
  playingVideo, 
  muted, 
  toggleMute,
  playVideo,
  pauseVideo
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlaying = playingVideo === videoId;

  // Registra/desregistra o vídeo quando o componente é montado/desmontado
  useEffect(() => {
    if (videoRef.current) {
      registerVideo(videoId, videoRef.current);
    }
    return () => {
      unregisterVideo(videoId);
    };
  }, [videoId, registerVideo, unregisterVideo]);

  const handleVideoClick = () => {
    if (isPlaying) {
      pauseVideo(videoId);
    } else {
      playVideo(videoId);
    }
  };

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        data-video-id={videoId}
        src={src}
        className={cn("w-full h-full object-cover cursor-pointer", className)}
        onClick={handleVideoClick}
        muted={muted}
        playsInline
        preload="metadata"
        loop
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isPlaying && (
          <Button
            size="icon"
            className="h-12 w-12 rounded-full bg-white/80 hover:bg-white"
            onClick={handleVideoClick}
          >
            <Play className="h-6 w-6 text-black ml-1" />
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-2 left-2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      {isPlaying && (
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <Pause className="h-3 w-3" /> Reproduzindo
        </div>
      )}
    </div>
  );
};

// Hook para gerenciar autoplay baseado na visibilidade
const useVideoAutoPlayer = () => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const playVideo = useCallback(async (videoId: string) => {
    const video = videoRefs.current.get(videoId);
    if (video && playingVideo !== videoId) {
      try {
        // Pausa o vídeo atual se houver um reproduzindo
        if (playingVideo) {
          videoRefs.current.get(playingVideo)?.pause();
        }
        
        setPlayingVideo(videoId);
        video.muted = muted;
        await video.play();
      } catch (e) {
        console.error("Erro ao reproduzir vídeo:", e);
      }
    }
  }, [playingVideo, muted]);

  const pauseVideo = useCallback((videoId: string) => {
    if (playingVideo === videoId) {
      videoRefs.current.get(videoId)?.pause();
      setPlayingVideo(null);
    }
  }, [playingVideo]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
    if (playingVideo) {
      const v = videoRefs.current.get(playingVideo);
      if (v) v.muted = !muted;
    }
  }, [playingVideo, muted]);

  // Configura o IntersectionObserver para detectar quando vídeos estão visíveis
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const videoId = entry.target.getAttribute('data-video-id');
        if (!videoId) return;
        
        // Se o vídeo está centralizado na tela (intersectionRatio alto)
        if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
          playVideo(videoId);
        } else if (playingVideo === videoId) {
          // Se o vídeo saiu da visualização, pausa
          pauseVideo(videoId);
        }
      });
    }, { 
      threshold: [0, 0.3, 0.7, 1],
      rootMargin: '0px 0px -10% 0px' // Considera 10% do final da tela como limite
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [playVideo, pauseVideo, playingVideo]);

  const registerVideo = useCallback((id: string, el: HTMLVideoElement) => {
    videoRefs.current.set(id, el);
    observerRef.current?.observe(el);
  }, []);

  const unregisterVideo = useCallback((id: string) => {
    const v = videoRefs.current.get(id);
    if (v) {
      observerRef.current?.unobserve(v);
    }
    videoRefs.current.delete(id);
    // Se o vídeo sendo desregistrado é o que está tocando, pausa
    if (playingVideo === id) {
      setPlayingVideo(null);
    }
  }, [playingVideo]);

  return { 
    playingVideo, 
    muted, 
    playVideo, 
    pauseVideo, 
    toggleMute, 
    registerVideo, 
    unregisterVideo 
  };
};

// Funções auxiliares para processamento de mídia
const MEDIA_PREFIX = { image: "image::", video: "video::", audio: "audio::" } as const;
const isVideoUrl = (u: string) => u.startsWith(MEDIA_PREFIX.video) || /\.(mp4|webm|ogg|mov|m4v)$/i.test(u.split("::").pop() || u);
const stripPrefix = (u: string) => u.replace(/^image::|^video::|^audio::/, "");

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
  likes: { id: string; user_id: string }[];
  comments: { id: string }[];
}

export default function Explore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsVideo, setViewerIsVideo] = useState(false);
  const [viewerVideoPlaying, setViewerVideoPlaying] = useState(false);

  // Usando o hook de autoplay
  const { 
    playingVideo, 
    muted, 
    playVideo, 
    pauseVideo, 
    toggleMute, 
    registerVideo, 
    unregisterVideo 
  } = useVideoAutoPlayer();

  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ["explore-posts", searchQuery, selectedTag],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles (username, avatar_url),
          likes (id, user_id),
          comments (id)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%`);
      }

      if (selectedTag) {
        query = query.ilike("content", `%${selectedTag}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Post[];
    },
  });

  const { data: trendingTags } = useQuery({
    queryKey: ["trending-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("content")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const tagCounts: Record<string, number> = {};
      data.forEach((post) => {
        const hashtags = post.content?.match(/#[\w]+/g) || [];
        hashtags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count }));
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("explore-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refetchPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => refetchPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    if (isLiked) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
    }

    refetchPosts();
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const renderContentWithHashtags = (content: string) => {
    const parts = content.split(/(#[\w]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span
            key={index}
            className="text-primary font-medium cursor-pointer hover:underline"
            onClick={() => setSelectedTag(part)}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Componente para renderizar mídias
  const renderMedia = (post: Post) => {
    if (!post.media_urls || post.media_urls.length === 0) return null;

    return (
      <div className={cn(
        "grid gap-2 rounded-lg overflow-hidden",
        post.media_urls.length === 1 && "grid-cols-1",
        post.media_urls.length === 2 && "grid-cols-2",
        post.media_urls.length >= 3 && "grid-cols-2"
      )}>
        {post.media_urls.slice(0, 4).map((url, idx) => {
          const mediaUrl = stripPrefix(url);
          const isVideo = isVideoUrl(url);
          const isSingle = post.media_urls.length === 1;
          const videoId = `${post.id}-${idx}`;

          if (isVideo) {
            return (
              <VideoPlayer
                key={idx}
                src={mediaUrl}
                className={cn(
                  isSingle && "max-h-96",
                  !isSingle && "h-48"
                )}
                isSingle={isSingle}
                videoId={videoId}
                registerVideo={registerVideo}
                unregisterVideo={unregisterVideo}
                playingVideo={playingVideo}
                muted={muted}
                toggleMute={toggleMute}
                playVideo={playVideo}
                pauseVideo={pauseVideo}
              />
            );
          }

          // Renderizar imagem
          return (
            <img
              key={idx}
              src={mediaUrl}
              alt=""
              className={cn(
                "w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity",
                isSingle && "max-h-96",
                !isSingle && "h-48"
              )}
              onClick={() => {
                setViewerUrl(mediaUrl);
                setViewerIsVideo(false);
                setViewerOpen(true);
              }}
            />
          );
        })}
      </div>
    );
  };

  const handleViewerVideoPlay = () => {
    setViewerVideoPlaying(true);
  };

  const handleViewerVideoPause = () => {
    setViewerVideoPlaying(false);
  };

  const popularTags = [
    "#tecnologia",
    "#design",
    "#dev",
    "#startup",
    "#ia",
    "#webX",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
          {/* Sidebar - AGORA NO TOPO */}
          <div className="lg:col-span-4 space-y-4">
            {/* Search Bar */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pessoas, posts, hashtags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-border/50"
                />
              </div>
            </Card>

            {/* Selected Tag */}
            {selectedTag && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedTag}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTag(null)}
                >
                  Limpar
                </Button>
              </div>
            )}

            {/* Trending Section - AGORA NO TOPO */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-bold">Trending</h3>
              </div>
              <div className="space-y-3">
                {trendingTags?.slice(0, 5).map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className="w-full text-left hover:bg-accent p-2 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-sm">{tag}</p>
                    <p className="text-xs text-muted-foreground">{count} posts</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Popular Tags - AGORA NO TOPO */}
            <Card className="p-4">
              <h3 className="font-bold mb-4">Tags populares</h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content - AGORA ABAIXO DA SIDEBAR NO LAYOUT */}
          <div className="lg:col-span-8">
            {/* Posts Feed */}
            <div className="space-y-4">
              {posts?.map((post) => {
                const isLiked = post.likes?.some((like) => like.user_id === user?.id);
                const likesCount = post.likes?.length || 0;
                const commentsCount = post.comments?.length || 0;

                return (
                  <Card key={post.id} className="p-6 space-y-4">
                    {/* Post Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={post.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {post.profiles?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <UserLink userId={post.user_id} username={post.profiles?.username || ''}>
                            {post.profiles?.username}
                          </UserLink>
                          <p className="text-xs text-muted-foreground">
                            há {formatTimeAgo(post.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Post Content */}
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed">
                        {renderContentWithHashtags(post.content || "")}
                      </p>

                      {/* Post Media (Images/Videos) */}
                      {renderMedia(post)}
                    </div>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "gap-2",
                            isLiked && "text-red-500 hover:text-red-600"
                          )}
                          onClick={() => toggleLike(post.id, isLiked)}
                        >
                          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                          <span className="text-xs">{likesCount}</span>
                        </Button>

                        <Button variant="ghost" size="sm" className="gap-2">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{commentsCount}</span>
                        </Button>

                        <Button variant="ghost" size="sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {posts?.length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery || selectedTag
                      ? "Nenhum post encontrado"
                      : "Nenhum post disponível"}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-0">
          <div className="relative h-[80vh] flex items-center justify-center">
            {viewerIsVideo && viewerUrl ? (
              <div className="relative w-full h-full">
                <video
                  src={viewerUrl}
                  className="max-h-full max-w-full object-contain"
                  controls
                  autoPlay
                  onPlay={handleViewerVideoPlay}
                  onPause={handleViewerVideoPause}
                />
                {!viewerVideoPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      size="icon"
                      className="h-16 w-16 rounded-full bg-white/80 hover:bg-white"
                      onClick={() => {
                        const video = document.querySelector('video');
                        video?.play();
                      }}
                    >
                      <Play className="h-8 w-8 text-black ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <img src={viewerUrl || ""} className="max-h-full max-w-full object-contain" />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => setViewerOpen(false)}
            >
              <MoreHorizontal className="h-4 w-4 rotate-45" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}