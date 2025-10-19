import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Settings, MapPin, Link as LinkIcon, Calendar, UserPlus, UserMinus } from "lucide-react";
import { useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: "",
    full_name: "",
    bio: "",
  });

  // ID do perfil a ser visualizado (pode ser o próprio ou de outro usuário)
  const profileId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

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

  const { data: userPosts } = useQuery({
    queryKey: ["userPosts", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`*, likes(id), comments(id)`)
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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

  // Verificar se está seguindo
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

  // Mutation para seguir/deixar de seguir
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
          .insert({
            follower_id: user.id,
            following_id: profileId,
          });

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
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
      toast({
        title: "Perfil atualizado!",
        description: "Suas alterações foram salvas.",
      });
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user?.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
      });
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user?.id);

    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast({
      title: "Foto atualizada!",
      description: "Sua foto de perfil foi alterada.",
    });
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Cover Image */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-primary via-secondary to-accent relative">
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-4 right-4"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-20 md:-mt-24">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <div className="relative">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                  {profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-white cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 space-y-4">
              {isEditing ? (
                <div className="space-y-4 bg-card p-4 rounded-lg border shadow-sm">
                  <div className="space-y-2">
                    <Label>Nome de usuário</Label>
                    <Input
                      value={editData.username}
                      onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input
                      value={editData.full_name}
                      onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateProfile.mutate(editData)}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      Salvar
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {profile?.full_name || profile?.username}
                    </h1>
                    <p className="text-muted-foreground">@{profile?.username}</p>
                  </div>

                  {profile?.bio && (
                    <p className="text-foreground">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Entrou em {new Date(profile?.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="font-bold text-foreground">{stats?.posts || 0}</span>
                      <span className="text-muted-foreground ml-1">posts</span>
                    </div>
                    <div>
                      <span className="font-bold text-foreground">{stats?.followers || 0}</span>
                      <span className="text-muted-foreground ml-1">seguidores</span>
                    </div>
                    <div>
                      <span className="font-bold text-foreground">{stats?.following || 0}</span>
                      <span className="text-muted-foreground ml-1">seguindo</span>
                    </div>
                  </div>

                  {isOwnProfile ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="w-full md:w-auto"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Editar Perfil
                    </Button>
                  ) : (
                    <Button
                      onClick={() => followMutation.mutate()}
                      disabled={followMutation.isPending}
                      variant={isFollowing ? "outline" : "default"}
                      className="w-full md:w-auto"
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
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <Tabs defaultValue="posts" className="mt-8">
          <TabsList className="w-full justify-start border-b border-border/50 rounded-none bg-transparent p-0">
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

          <TabsContent value="posts" className="mt-6 space-y-4">
            {userPosts?.map((post) => (
              <Card key={post.id} className="border shadow-sm bg-card">
                <CardContent className="pt-6">
                  <p className="mb-4">{post.content}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{post.likes?.length || 0} curtidas</span>
                    <span>{post.comments?.length || 0} comentários</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {userPosts?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum post ainda</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma mídia ainda</p>
            </div>
          </TabsContent>

          <TabsContent value="likes" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma curtida ainda</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
