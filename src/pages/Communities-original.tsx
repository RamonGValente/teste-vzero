import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Search, MessageCircle, TrendingUp, Lock, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLink } from "@/components/UserLink";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { saveMentions } from "@/utils/mentionsHelper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MentionText } from "@/components/MentionText";

interface Community {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  created_at: string;
  created_by: string;
  is_private: boolean;
  password_hash: string | null;
  community_members: { id: string; user_id: string }[];
  community_posts: { id: string }[];
}

export default function Communities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    isPrivate: false,
    password: "",
    avatarUrl: "",
  });
  const [newPost, setNewPost] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Mark communities as viewed when user visits
  useEffect(() => {
    if (!user) return;

    const markAsViewed = async () => {
      await supabase
        .from("last_viewed")
        .upsert(
          { user_id: user.id, section: "communities", viewed_at: new Date().toISOString() },
          { onConflict: "user_id,section" }
        );
      
      // Invalidar o contador imediatamente
      queryClient.invalidateQueries({ queryKey: ["unread-communities", user.id] });
    };

    markAsViewed();
  }, [user, queryClient]);

  const { data: communities, refetch: refetchCommunities } = useQuery({
    queryKey: ["communities", searchQuery],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("communities")
        .select(`
          *,
          community_members (id, user_id),
          community_posts (id)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Community[];
    },
  });

  const { data: myCommunities } = useQuery({
    queryKey: ["my-communities", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("community_members")
        .select(`
          community_id,
          communities (*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((item: any) => item.communities);
    },
  });

  const { data: communityPosts, refetch: refetchPosts } = useQuery({
    queryKey: ["community-posts", selectedCommunity],
    enabled: !!selectedCommunity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq("community_id", selectedCommunity)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("communities-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "communities" }, () => refetchCommunities())
      .on("postgres_changes", { event: "*", schema: "public", table: "community_members" }, () => refetchCommunities())
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => refetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCommunity]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setNewCommunity({ ...newCommunity, avatarUrl: publicUrl });
      
      toast({
        title: "Avatar carregado!",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erro ao carregar avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCreateCommunity = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado",
        variant: "destructive",
      });
      return;
    }

    if (!newCommunity.name.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para a comunidade",
        variant: "destructive",
      });
      return;
    }

    if (newCommunity.isPrivate && !newCommunity.password.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma senha para a comunidade privada",
        variant: "destructive",
      });
      return;
    }

    const { data: community, error } = await supabase
      .from("communities")
      .insert({
        name: newCommunity.name,
        description: newCommunity.description,
        created_by: user.id,
        is_private: newCommunity.isPrivate,
        password_hash: newCommunity.isPrivate ? btoa(newCommunity.password) : null,
        avatar_url: newCommunity.avatarUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating community:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a comunidade",
        variant: "destructive",
      });
      return;
    }

    // Add creator as first member
    await supabase.from("community_members").insert({
      community_id: community.id,
      user_id: user.id,
      role: "admin",
    });

    toast({
      title: "Comunidade criada!",
      description: `${newCommunity.name} foi criada com sucesso`,
    });

    setNewCommunity({ name: "", description: "", isPrivate: false, password: "", avatarUrl: "" });
    setShowCreateDialog(false);
    refetchCommunities();
  };

  const handleJoinCommunity = async (communityId: string, password?: string) => {
    if (!user) return;

    const community = communities?.find(c => c.id === communityId);
    
    if (community?.is_private) {
      if (!password) {
        setShowPasswordDialog(communityId);
        return;
      }
      
      if (btoa(password) !== community.password_hash) {
        toast({
          title: "Erro",
          description: "Senha incorreta",
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Você já é membro",
          description: "Você já faz parte desta comunidade",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível entrar na comunidade",
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "Sucesso!",
      description: "Você agora faz parte da comunidade",
    });

    setShowPasswordDialog(null);
    setJoinPassword("");
    refetchCommunities();
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!user) return;

    await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", user.id);

    toast({
      title: "Você saiu da comunidade",
    });

    refetchCommunities();
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !selectedCommunity || !user) return;

    const { data: postData, error } = await supabase.from("community_posts").insert({
      community_id: selectedCommunity,
      user_id: user.id,
      content: newPost,
    }).select().single();
    if (!error && postData) {
      await saveMentions(postData.id, 'community_post', newPost, user.id);
    }

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o post",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Post criado!",
    });

    setNewPost("");
    refetchPosts();
  };

  const isMember = (communityId: string) => {
    return myCommunities?.some((c: any) => c.id === communityId);
  };

  const isCreator = (communityId: string) => {
    const community = communities?.find(c => c.id === communityId);
    return community?.created_by === user?.id;
  };

  const handleDeleteCommunity = async (communityId: string) => {
    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", communityId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a comunidade",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Comunidade excluída",
    });

    setShowDeleteDialog(null);
    setSelectedCommunity(null);
    refetchCommunities();
  };

  const handleRemoveMember = async (communityId: string, memberId: string) => {
    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", memberId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o membro",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Membro removido",
    });

    refetchCommunities();
  };

  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-green-500 to-emerald-500",
    "from-indigo-500 to-blue-500",
    "from-pink-500 to-rose-500",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Comunidades</h1>
            <p className="text-muted-foreground">
              Descubra e participe de comunidades incríveis
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Comunidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Comunidade</DialogTitle>
                <DialogDescription>
                  Preencha as informações para criar sua comunidade
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={newCommunity.avatarUrl} />
                      <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white text-2xl">
                        {newCommunity.name[0]?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <Label className="text-xs text-muted-foreground">
                    Clique no ícone para adicionar uma foto
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    placeholder="Nome da comunidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    placeholder="Descrição da comunidade"
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <Label htmlFor="isPrivate" className="cursor-pointer">
                      Comunidade privada (requer senha)
                    </Label>
                  </div>
                  <Switch
                    id="isPrivate"
                    checked={newCommunity.isPrivate}
                    onCheckedChange={(checked) => setNewCommunity({ ...newCommunity, isPrivate: checked })}
                  />
                </div>
                {newCommunity.isPrivate && (
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      value={newCommunity.password}
                      onChange={(e) => setNewCommunity({ ...newCommunity, password: e.target.value })}
                      placeholder="Digite uma senha"
                    />
                  </div>
                )}
                <Button onClick={handleCreateCommunity} className="w-full">
                  Criar Comunidade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="my">Minhas Comunidades</TabsTrigger>
          </TabsList>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar comunidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {communities?.map((community, idx) => (
                <Card
                  key={community.id}
                  className="border shadow-sm bg-card hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => setSelectedCommunity(community.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className={`h-16 w-16 bg-gradient-to-r ${colors[idx % colors.length]}`}>
                        <AvatarImage src={community.avatar_url} />
                        <AvatarFallback className="text-white font-bold text-xl">
                          {community.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="group-hover:text-primary transition-colors">
                            {community.name}
                          </CardTitle>
                          {community.is_private && (
                            <Badge variant="secondary" className="text-xs">🔒 Privada</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Users className="h-4 w-4" />
                          <span>{community.community_members?.length || 0} membros</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {community.description || `Comunidade dedicada a ${community.name.toLowerCase()}`}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        <span>{community.community_posts?.length || 0} posts</span>
                      </div>
                      {isMember(community.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveCommunity(community.id);
                          }}
                        >
                          Sair
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (community.is_private) {
                              setShowPasswordDialog(community.id);
                            } else {
                              handleJoinCommunity(community.id);
                            }
                          }}
                        >
                          Participar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {communities?.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Nenhuma comunidade encontrada</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myCommunities?.map((community: any, idx: number) => (
                <Card
                  key={community.id}
                  className="border shadow-sm bg-card hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => setSelectedCommunity(community.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className={`h-16 w-16 bg-gradient-to-r ${colors[idx % colors.length]}`}>
                        <AvatarFallback className="text-white font-bold text-xl">
                          {community.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {community.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {community.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveCommunity(community.id);
                      }}
                    >
                      Sair
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {myCommunities?.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  Você ainda não faz parte de nenhuma comunidade
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Community Detail Dialog */}
      <Dialog open={!!selectedCommunity} onOpenChange={() => setSelectedCommunity(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {communities?.find((c) => c.id === selectedCommunity)?.name}
                </DialogTitle>
                <DialogDescription>
                  {communities?.find((c) => c.id === selectedCommunity)?.description}
                </DialogDescription>
              </div>
              {isCreator(selectedCommunity!) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(selectedCommunity)}
                >
                  Excluir Comunidade
                </Button>
              )}
            </div>
          </DialogHeader>

          {isMember(selectedCommunity!) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Criar Post</Label>
                <Textarea
                  placeholder="Compartilhe algo com a comunidade..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleCreatePost} disabled={!newPost.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Publicar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold">Posts Recentes</h3>
            {communityPosts?.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <UserLink userId={post.user_id} username={post.profiles?.username || ''}>
                        <span className="text-sm">{post.profiles?.username}</span>
                      </UserLink>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm"><MentionText text={post.content ?? ""} /></p>
                </CardContent>
              </Card>
            ))}

            {communityPosts?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum post ainda. Seja o primeiro a publicar!
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={!!showPasswordDialog} onOpenChange={() => {
        setShowPasswordDialog(null);
        setJoinPassword("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comunidade Privada</DialogTitle>
            <DialogDescription>
              Esta comunidade é privada. Digite a senha para entrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Digite a senha"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && showPasswordDialog) {
                    handleJoinCommunity(showPasswordDialog, joinPassword);
                  }
                }}
              />
            </div>
            <Button 
              onClick={() => showPasswordDialog && handleJoinCommunity(showPasswordDialog, joinPassword)}
              className="w-full"
              disabled={!joinPassword.trim()}
            >
              Entrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Comunidade</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta comunidade? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => showDeleteDialog && handleDeleteCommunity(showDeleteDialog)}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}