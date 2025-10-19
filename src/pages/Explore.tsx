import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { saveMentions } from "@/utils/mentionsHelper";
import { cn } from "@/lib/utils";
import { MentionText } from "@/components/MentionText";

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
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-4">
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

                      {/* Post Images */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className={cn(
                          "grid gap-2 rounded-lg overflow-hidden",
                          post.media_urls.length === 1 && "grid-cols-1",
                          post.media_urls.length === 2 && "grid-cols-2",
                          post.media_urls.length >= 3 && "grid-cols-2"
                        )}>
                          {post.media_urls.slice(0, 4).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className={cn(
                                "w-full h-full object-cover",
                                post.media_urls.length === 1 && "max-h-96",
                                post.media_urls.length > 1 && "h-48"
                              )}
                            />
                          ))}
                        </div>
                      )}
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

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Trending Section */}
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

            {/* Popular Tags */}
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
        </div>
      </div>
    </div>
  );
}