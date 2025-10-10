import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Moon, Menu, Users } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useNavigate } from "react-router-dom";
import PostFeed from "./PostFeed";
import CreatePostModal from "./CreatePostModal";
import SocialContactsPanel from "./SocialContactsPanel";
import { UserProfile } from "@/components/chat/UserProfile";

export type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  expires_at: string;
  created_at: string;
  status: "active" | "fixed" | "deleted";
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    user_code: string | null;
  } | null;
};

export default function SocialNetwork() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContactsPanel, setShowContactsPanel] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            user_code
          )
        `)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar posts:", error);
        return;
      }
      
      setPosts(data || []);
    } catch (error) {
      console.error("Erro inesperado:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profile);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchUserData();
    
    const channel = supabase
      .channel("posts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        fetchPosts
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Área Principal - Layout Igual ao Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header Igual ao Chat */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContactsPanel(true)}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-10 w-auto object-contain select-none"
                  draggable={false}
                />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Rede Social</h1>
                  <p className="text-sm text-muted-foreground">
                    Conecte-se com sua comunidade
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Estatísticas */}
              <div className="hidden sm:flex items-center gap-4 mr-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {posts.filter(post => post.status === 'active').length} ativos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {posts.filter(post => post.status === 'fixed').length} destacados
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
                title="Voltar para Chat"
              >
                <Users className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground"
              >
                <Moon className="h-5 w-5" />
              </Button>

              {/* Botão Menu para abrir contatos - Visível no desktop */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContactsPanel(true)}
                className="hidden md:flex text-muted-foreground hover:text-foreground"
                title="Ver contatos"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Perfil do Usuário - Similar ao chat */}
        <div className="bg-card border-b border-border px-4 py-3">
          <UserProfile user={user} profile={profile} />
        </div>

        {/* Feed de Posts */}
        <div className="flex-1 overflow-y-auto bg-muted/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Carregando postagens...</p>
            </div>
          ) : (
            <div className="p-4">
              <PostFeed posts={posts} />
            </div>
          )}
        </div>
      </div>

      {/* Painel de Contatos - Overlay igual ao chat */}
      <SocialContactsPanel 
        isOpen={showContactsPanel}
        onClose={() => setShowContactsPanel(false)}
      />

      {/* Botão Flutuante para Criar Post */}
      <Button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40"
        size="icon"
      >
        <span className="text-2xl font-bold">+</span>
      </Button>

      {/* Modal de Criar Post */}
      <CreatePostModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onPostCreated={() => {
          fetchPosts();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}