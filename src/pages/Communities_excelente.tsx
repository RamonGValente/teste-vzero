import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Plus, Search, MessageCircle, TrendingUp, 
  Lock, Camera, MoreHorizontal, ArrowLeft, Shield, 
  Settings, UserPlus, LogOut, Trash2, Crown, 
  UserMinus, ShieldCheck, Image as ImageIcon, MapPin, 
  Globe, LayoutGrid, CheckCircle2, Share2, X, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MentionText } from "@/components/MentionText";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- TIPOS ---

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface CommunityMember {
  id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  profiles: Profile;
}

interface Community {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  cover_url: string | null;
  created_at: string;
  created_by: string;
  is_private: boolean;
  password_hash: string | null;
  member_count?: number; 
  post_count?: number;   
  community_members: { id: string }[];
  community_posts: { id: string }[];
}

interface CommunityPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  media_urls: string[] | null;
  profiles: Profile;
}

// --- UTILITÁRIOS VISUAIS (Gradients do World Flow) ---

const GRADIENTS = [
  "from-blue-600 to-purple-600",
  "from-pink-600 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-indigo-600 to-blue-500",
];

const getGradient = (id: string) => GRADIENTS[id.charCodeAt(0) % GRADIENTS.length];

export default function Communities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // --- ESTADOS ---
  const [viewMode, setViewMode] = useState<'explore' | 'detail'>('explore');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  
  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  
  // Tabs Internas
  const [activeTab, setActiveTab] = useState("feed");
  
  // Modais
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  
  // Formulários
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    isPrivate: false,
    password: "",
    avatarUrl: "",
    coverUrl: "",
  });
  const [newPost, setNewPost] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // --- QUERIES ---

  const { data: allCommunities, isLoading: loadingAll } = useQuery({
    queryKey: ["all-communities", searchQuery, filterType],
    queryFn: async () => {
      let query = supabase
        .from("communities")
        .select(`
          *,
          community_members(id),
          community_posts(id)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      if (filterType === 'public') query = query.eq("is_private", false);
      if (filterType === 'private') query = query.eq("is_private", true);

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map((c: any) => ({
        ...c,
        member_count: c.community_members.length,
        post_count: c.community_posts.length
      })) as Community[];
    },
  });

  const { data: myCommunities } = useQuery({
    queryKey: ["my-communities", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select(`community_id, communities (*)`)
        .eq("user_id", user?.id);
      
      if (error) throw error;
      return data.map((item: any) => item.communities) as Community[];
    },
  });

  const { data: communityPosts, refetch: refetchPosts } = useQuery({
    queryKey: ["community-posts", selectedCommunityId],
    enabled: !!selectedCommunityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`*, profiles:user_id (id, username, avatar_url, full_name)`)
        .eq("community_id", selectedCommunityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CommunityPost[];
    },
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["community-members", selectedCommunityId],
    enabled: !!selectedCommunityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select(`*, profiles:user_id (id, username, avatar_url, full_name)`)
        .eq("community_id", selectedCommunityId)
        .order("role", { ascending: true });
      if (error) throw error;
      return data as CommunityMember[];
    },
  });

  // --- ACTIONS ---

  const handleSelectCommunity = (id: string) => {
    setSelectedCommunityId(id);
    setViewMode('detail');
    setActiveTab('feed');
  };

  const handleBackToExplore = () => {
    setSelectedCommunityId(null);
    setViewMode('explore');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${type}.${fileExt}`;
      const bucket = 'avatars'; 

      const { error } = await supabase.storage.from(bucket).upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      setNewCommunity(prev => ({
        ...prev,
        [type === 'avatar' ? 'avatarUrl' : 'coverUrl']: publicUrl
      }));
      toast({ title: "Imagem carregada com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao fazer upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCommunity = async () => {
    if (!newCommunity.name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });

    try {
      const { data: comm, error } = await supabase.from("communities").insert({
        name: newCommunity.name,
        description: newCommunity.description,
        created_by: user?.id,
        is_private: newCommunity.isPrivate,
        password_hash: newCommunity.isPrivate ? btoa(newCommunity.password) : null,
        avatar_url: newCommunity.avatarUrl || null,
        cover_url: newCommunity.coverUrl || null,
      }).select().single();

      if (error) throw error;

      await supabase.from("community_members").insert({
        community_id: comm.id,
        user_id: user?.id,
        role: 'admin'
      });

      toast({ title: "Comunidade criada!", description: "Você é o administrador." });
      setShowCreateDialog(false);
      setNewCommunity({ name: "", description: "", isPrivate: false, password: "", avatarUrl: "", coverUrl: "" });
      queryClient.invalidateQueries({ queryKey: ["all-communities"] });
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleJoin = async (community: Community, passwordInput?: string) => {
    if (myCommunities?.some(c => c.id === community.id)) {
      handleSelectCommunity(community.id);
      return;
    }

    if (community.is_private) {
      if (!passwordInput) {
        setShowPasswordDialog(community.id);
        return;
      }
      if (btoa(passwordInput) !== community.password_hash) {
        toast({ title: "Senha incorreta", variant: "destructive" });
        return;
      }
    }

    const { error } = await supabase.from("community_members").insert({
      community_id: community.id,
      user_id: user?.id,
      role: 'member'
    });

    if (error) {
      toast({ title: "Erro ao entrar", variant: "destructive" });
    } else {
      toast({ title: `Bem-vindo à ${community.name}!` });
      setShowPasswordDialog(null);
      setJoinPassword("");
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      queryClient.invalidateQueries({ queryKey: ["all-communities"] });
    }
  };

  const handlePost = async () => {
    if (!newPost.trim() || !selectedCommunityId) return;
    const { data, error } = await supabase.from("community_posts").insert({
      community_id: selectedCommunityId,
      user_id: user?.id,
      content: newPost
    }).select().single();

    if (!error && data) {
      await saveMentions(data.id, 'community_post', newPost, user?.id || '');
      setNewPost("");
      refetchPosts();
      toast({ title: "Publicado!" });
    }
  };

  // --- PERMISSÕES & UTILS ---
  const selectedCommunity = allCommunities?.find(c => c.id === selectedCommunityId);
  const myMemberInfo = members?.find(m => m.user_id === user?.id);
  const isMember = !!myMemberInfo;
  const isAdmin = myMemberInfo?.role === 'admin';
  const isMod = myMemberInfo?.role === 'moderator' || isAdmin;

  // --- RENDERIZAÇÃO ---

  return (
    <div className="min-h-screen bg-black text-white md:bg-white md:text-black flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR DE NAVEGAÇÃO RÁPIDA (Desktop) - Estilo Dark Glass */}
      <aside className="w-full md:w-72 border-r border-gray-800 md:border-gray-200 bg-gray-950/50 md:bg-white backdrop-blur-xl hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-800 md:border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="font-bold text-lg text-white md:text-black">Comunidades</h2>
          </div>
          <p className="text-xs text-gray-400 md:text-gray-600 mt-1">Seus grupos e tribos.</p>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Acesso Rápido</h3>
              <nav className="space-y-1">
                <Button 
                  variant="ghost"
                  className={cn("w-full justify-start text-sm hover:bg-white/5 hover:text-white md:hover:bg-gray-100 md:hover:text-black", viewMode === 'explore' ? "bg-white/10 text-white md:bg-gray-200 md:text-black" : "text-gray-400 md:text-gray-600")} 
                  onClick={handleBackToExplore}
                >
                  <LayoutGrid className="mr-3 h-4 w-4" /> Explorar Todos
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm text-gray-400 md:text-gray-600 hover:bg-white/5 hover:text-white md:hover:bg-gray-100 md:hover:text-black" 
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-3 h-4 w-4" /> Criar Novo
                </Button>
              </nav>
            </div>

            {myCommunities && myCommunities.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Meus Grupos</h3>
                <div className="space-y-1">
                  {myCommunities.map(comm => (
                    <button
                      key={comm.id}
                      onClick={() => handleSelectCommunity(comm.id)}
                      className={`flex items-center gap-3 w-full p-2 rounded-lg text-left transition-all group ${
                        selectedCommunityId === comm.id 
                          ? "bg-gradient-to-r from-blue-900/40 to-purple-900/40 md:bg-gradient-to-r md:from-blue-100 md:to-purple-100 border border-blue-500/30 md:border-blue-300 text-white md:text-black" 
                          : "hover:bg-white/5 md:hover:bg-gray-100 text-gray-400 md:text-gray-700 hover:text-white md:hover:text-black"
                      }`}
                    >
                      <Avatar className="h-8 w-8 ring-1 ring-white/10 md:ring-gray-300">
                        <AvatarImage src={comm.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-gray-800 md:bg-gray-200 text-gray-300 md:text-gray-700">{comm.name.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{comm.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ÁREA PRINCIPAL - Fundo Preto no mobile, Branco no desktop */}
      <main className="flex-1 h-screen overflow-y-auto bg-black md:bg-white relative">
        
        {/* VIEW: EXPLORE (GRID DE COMUNIDADES) */}
        {viewMode === 'explore' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            
            {/* Header de Busca - Estilo Card Dark no mobile, Light no desktop */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/60 md:bg-gray-100 p-6 rounded-2xl border border-white/5 md:border-gray-200 backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white md:text-black">
                  <Globe className="h-6 w-6 text-blue-500" /> Descobrir
                </h1>
                <p className="text-gray-400 md:text-gray-600 text-sm mt-1">Encontre pessoas com os mesmos interesses que você.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="Buscar comunidades..." 
                    className="pl-10 bg-black/50 md:bg-white border-gray-800 md:border-gray-300 text-white md:text-black placeholder:text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-black/50 md:bg-gray-200 rounded-lg p-1 border border-gray-800 md:border-gray-300">
                  <Button 
                    variant="ghost"
                    size="sm" 
                    onClick={() => setFilterType('all')} 
                    className={cn("rounded-md px-3 h-8 text-xs", filterType === 'all' ? "bg-gray-800 md:bg-gray-800 text-white" : "text-gray-500 md:text-gray-600 hover:text-white md:hover:text-black")}
                  >Todas</Button>
                  <Button 
                    variant="ghost"
                    size="sm" 
                    onClick={() => setFilterType('public')} 
                    className={cn("rounded-md px-3 h-8 text-xs", filterType === 'public' ? "bg-gray-800 md:bg-gray-800 text-white" : "text-gray-500 md:text-gray-600 hover:text-white md:hover:text-black")}
                  >Públicas</Button>
                  <Button 
                    variant="ghost"
                    size="sm" 
                    onClick={() => setFilterType('private')} 
                    className={cn("rounded-md px-3 h-8 text-xs", filterType === 'private' ? "bg-gray-800 md:bg-gray-800 text-white" : "text-gray-500 md:text-gray-600 hover:text-white md:hover:text-black")}
                  >Privadas</Button>
                </div>
              </div>
            </div>

            {/* Grid de Resultados */}
            {loadingAll ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 w-full rounded-2xl bg-gray-900 md:bg-gray-200" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {allCommunities?.map((comm) => (
                  <Card key={comm.id} className="group overflow-hidden border-gray-800 md:border-gray-200 bg-gray-900/40 md:bg-white hover:bg-gray-900 md:hover:bg-gray-50 hover:border-gray-700 md:hover:border-gray-300 hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-300 flex flex-col h-full">
                    {/* Cover Image Area */}
                    <div className={`h-32 relative bg-gradient-to-r ${getGradient(comm.id)}`}>
                      {comm.cover_url && (
                        <img 
                          src={comm.cover_url} 
                          alt="Cover" 
                          className="w-full h-full object-cover absolute inset-0 mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-700"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="absolute top-3 right-3">
                        {comm.is_private ? (
                          <Badge className="bg-black/60 md:bg-gray-800 text-white backdrop-blur-md border-none gap-1 hover:bg-black/80 md:hover:bg-gray-900">
                            <Lock className="h-3 w-3" /> Privado
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 md:bg-emerald-100 text-emerald-300 md:text-emerald-700 backdrop-blur-md border border-emerald-500/30 gap-1 hover:bg-emerald-500/30 md:hover:bg-emerald-200">
                            <Globe className="h-3 w-3" /> Público
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardContent className="pt-0 flex-1 flex flex-col relative px-6">
                      <div className="-mt-10 mb-4 flex justify-between items-end">
                        <Avatar className="h-20 w-20 border-4 border-gray-900 md:border-white shadow-xl rounded-2xl bg-gray-800 md:bg-gray-200">
                          <AvatarImage src={comm.avatar_url || undefined} className="object-cover"/>
                          <AvatarFallback className="text-xl font-bold bg-gray-800 md:bg-gray-300 text-gray-400 md:text-gray-700">{comm.name[0]}</AvatarFallback>
                        </Avatar>
                        
                        {/* Status de Membro / Botão */}
                        {myCommunities?.some(c => c.id === comm.id) ? (
                           <Badge variant="outline" className="border-blue-500/50 text-blue-400 md:text-blue-600 gap-1 py-1 px-3 bg-blue-500/10 md:bg-blue-100">
                             <CheckCircle2 className="h-3.5 w-3.5" /> Membro
                           </Badge>
                        ) : (
                           <div className="text-xs text-gray-500 md:text-gray-600 font-medium mb-1 flex items-center gap-1">
                             <Users className="h-3 w-3" /> {comm.member_count} membros
                           </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <h3 className="font-bold text-xl text-white md:text-black group-hover:text-blue-400 md:group-hover:text-blue-600 transition-colors truncate" title={comm.name}>
                          {comm.name}
                        </h3>
                        <p className="text-gray-400 md:text-gray-600 text-sm mt-2 line-clamp-2 min-h-[40px]">
                          {comm.description || "Sem descrição disponível."}
                        </p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-800 md:border-gray-200 flex items-center justify-between">
                         <div className="flex -space-x-2">
                            {[1,2,3].map(i => (
                              <div key={i} className="h-6 w-6 rounded-full border-2 border-gray-900 md:border-white bg-gray-800 md:bg-gray-300 flex items-center justify-center text-[8px] text-gray-500 md:text-gray-600">
                                ?
                              </div>
                            ))}
                         </div>
                         <Button 
                           size="sm"
                           onClick={() => handleJoin(comm)}
                           className={cn(
                             "px-6 rounded-full font-medium transition-all",
                             myCommunities?.some(c => c.id === comm.id) 
                              ? "bg-gray-800 md:bg-gray-300 text-white md:text-black hover:bg-gray-700 md:hover:bg-gray-400" 
                              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/20 text-white border-none"
                           )}
                         >
                           {myCommunities?.some(c => c.id === comm.id) ? "Abrir" : "Entrar"}
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!loadingAll && allCommunities?.length === 0 && (
              <div className="text-center py-20 opacity-50">
                <Search className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-bold text-gray-300 md:text-gray-700">Nenhuma comunidade encontrada</h3>
                <p className="text-gray-500">Tente outros termos ou crie a sua própria!</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW: DETAIL (FEED, MEMBROS, ETC) */}
        {viewMode === 'detail' && selectedCommunity && (
          <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300 bg-black md:bg-white">
            
            {/* HERO HEADER DA COMUNIDADE */}
            <div className="relative h-64 md:h-80 w-full shrink-0">
               <div className={`absolute inset-0 bg-gradient-to-r ${getGradient(selectedCommunity.id)}`}>
                  {selectedCommunity.cover_url && (
                    <img src={selectedCommunity.cover_url} className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                  )}
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
               </div>
               
               {/* Nav Bar Flutuante */}
               <div className="absolute top-4 left-4 z-20">
                 <Button size="sm" onClick={handleBackToExplore} className="bg-black/40 text-white hover:bg-black/60 border border-white/10 backdrop-blur-md rounded-full">
                   <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                 </Button>
               </div>

               {/* Conteúdo Hero */}
               <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex items-end justify-between">
                  <div className="flex items-end gap-6">
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-black rounded-2xl shadow-2xl -mb-4 md:-mb-6 bg-gray-900">
                      <AvatarImage src={selectedCommunity.avatar_url || undefined} className="object-cover"/>
                      <AvatarFallback className="text-4xl bg-gray-900 text-gray-300">{selectedCommunity.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="mb-2 md:mb-4 text-white drop-shadow-lg">
                      <h1 className="text-3xl md:text-5xl font-black tracking-tight">{selectedCommunity.name}</h1>
                      <div className="flex items-center gap-4 mt-2 text-sm md:text-base opacity-90 font-medium text-gray-200">
                        <span className="flex items-center gap-1.5">
                           {selectedCommunity.is_private ? <Lock className="h-4 w-4 text-gray-400" /> : <Globe className="h-4 w-4 text-emerald-400" />}
                           {selectedCommunity.is_private ? "Grupo Privado" : "Grupo Público"}
                        </span>
                        <span>•</span>
                        <span>{members?.length || 0} Membros</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Usuário na Comunidade */}
                  <div className="flex gap-2 mb-4 md:mb-6">
                    {isMember && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-white/10 text-white hover:bg-white/20 border border-white/5 backdrop-blur-sm">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 text-white md:bg-white md:border-gray-200 md:text-black">
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast({ title: "Link copiado!" });
                          }} className="focus:bg-gray-800 focus:text-white md:focus:bg-gray-100 md:focus:text-black cursor-pointer">
                            <Share2 className="h-4 w-4 mr-2" /> Compartilhar
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem className="focus:bg-gray-800 focus:text-white md:focus:bg-gray-100 md:focus:text-black cursor-pointer">
                              <Settings className="h-4 w-4 mr-2" /> Configurações
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-gray-800 md:bg-gray-200"/>
                          <DropdownMenuItem className="text-red-400 focus:bg-red-900/20 focus:text-red-300 md:focus:bg-red-100 md:focus:text-red-700 cursor-pointer" onClick={() => {
                             toast({ title: "Funcionalidade de sair (implementar)" });
                          }}>
                            <LogOut className="h-4 w-4 mr-2" /> Sair do Grupo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {!isMember && (
                      <Button onClick={() => handleJoin(selectedCommunity)} className="shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none rounded-full px-6 font-bold hover:shadow-blue-500/25">
                        Participar
                      </Button>
                    )}
                  </div>
               </div>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="flex-1 overflow-hidden flex flex-col pt-8 md:pt-10">
               <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                  <div className="px-6 md:px-10 border-b border-gray-800 md:border-gray-200 sticky top-0 bg-black/80 md:bg-white/80 backdrop-blur z-10">
                    <TabsList className="bg-transparent h-12 w-full justify-start gap-8 p-0">
                      <TabsTrigger value="feed" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-gray-400 md:text-gray-600 rounded-none px-0 pb-3 bg-transparent hover:text-white md:hover:text-black transition-colors">Feed</TabsTrigger>
                      <TabsTrigger value="members" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-gray-400 md:text-gray-600 rounded-none px-0 pb-3 bg-transparent hover:text-white md:hover:text-black transition-colors">Membros</TabsTrigger>
                      <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-gray-400 md:text-gray-600 rounded-none px-0 pb-3 bg-transparent hover:text-white md:hover:text-black transition-colors">Sobre</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-black md:bg-white p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                      
                      {/* --- FEED --- */}
                      <TabsContent value="feed" className="mt-0 space-y-6">
                        {isMember && (
                          <Card className="border-gray-800 md:border-gray-200 bg-gray-900/50 md:bg-gray-100 p-4 flex gap-4 animate-in fade-in slide-in-from-bottom-4 shadow-lg shadow-black/50">
                             <Avatar>
                               <AvatarImage src={user?.user_metadata?.avatar_url} />
                               <AvatarFallback className="bg-gray-800 md:bg-gray-300 text-gray-400 md:text-gray-700">{user?.email?.[0]}</AvatarFallback>
                             </Avatar>
                             <div className="flex-1 space-y-3">
                               <Textarea 
                                 placeholder={`O que você está pensando?`} 
                                 className="border-none bg-black/30 md:bg-white resize-none min-h-[80px] text-base focus-visible:ring-0 text-white md:text-black placeholder:text-gray-600 rounded-xl p-3"
                                 value={newPost}
                                 onChange={e => setNewPost(e.target.value)}
                               />
                               <div className="flex justify-between items-center">
                                 <div className="flex gap-2">
                                   <Button variant="ghost" size="icon" className="text-gray-400 hover:text-purple-400 hover:bg-purple-500/10"><ImageIcon className="h-5 w-5" /></Button>
                                   <Button variant="ghost" size="icon" className="text-gray-400 hover:text-purple-400 hover:bg-purple-500/10"><MapPin className="h-5 w-5" /></Button>
                                 </div>
                                 <Button onClick={handlePost} disabled={!newPost.trim()} className="rounded-full px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/20 border-none">
                                   Publicar
                                 </Button>
                               </div>
                             </div>
                          </Card>
                        )}

                        <div className="space-y-4">
                          {communityPosts?.map((post) => (
                             <Card key={post.id} className="border-gray-800 md:border-gray-200 bg-gray-900/40 md:bg-gray-50 hover:bg-gray-900/60 md:hover:bg-gray-100 transition-all shadow-md">
                               <CardHeader className="flex flex-row items-start gap-4 pb-2 pt-4 px-4">
                                  <Avatar className="cursor-pointer ring-1 ring-white/10 md:ring-gray-300">
                                    <AvatarImage src={post.profiles.avatar_url || undefined} />
                                    <AvatarFallback className="bg-gray-800 md:bg-gray-300 text-gray-400 md:text-gray-700">{post.profiles.username[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-white md:text-black hover:text-purple-400 hover:underline cursor-pointer transition-colors">{post.profiles.full_name || post.profiles.username}</span>
                                      <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">@{post.profiles.username}</span>
                                  </div>
                               </CardHeader>
                               <CardContent className="px-4 pb-4">
                                 <MentionText text={post.content} className="text-sm leading-relaxed whitespace-pre-wrap text-gray-200 md:text-gray-800" />
                               </CardContent>
                             </Card>
                          ))}
                          {communityPosts?.length === 0 && (
                            <div className="text-center py-12 opacity-40">
                              <div className="bg-gray-900 md:bg-gray-200 p-4 rounded-full inline-block mb-3">
                                <MessageCircle className="h-8 w-8 text-gray-500" />
                              </div>
                              <p className="text-gray-500">Nenhuma publicação ainda.</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* --- MEMBROS --- */}
                      <TabsContent value="members" className="mt-0">
                        <Card className="border-gray-800 md:border-gray-200 bg-gray-900/30 md:bg-gray-100">
                           <CardHeader><CardTitle className="text-white md:text-black">Membros da Comunidade ({members?.length})</CardTitle></CardHeader>
                           <CardContent className="grid gap-2">
                              {members?.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 hover:bg-white/5 md:hover:bg-gray-200 rounded-xl transition-colors border border-transparent hover:border-white/5 md:hover:border-gray-300">
                                   <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10 ring-1 ring-white/10 md:ring-gray-300">
                                        <AvatarImage src={member.profiles.avatar_url || undefined} />
                                        <AvatarFallback className="bg-gray-800 md:bg-gray-300 text-gray-400 md:text-gray-700">{member.profiles.username[0]}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="flex items-center gap-2">
                                           <span className="font-medium text-white md:text-black">{member.profiles.full_name || member.profiles.username}</span>
                                           {member.role === 'admin' && <Badge variant="default" className="text-[10px] h-5 bg-amber-500/20 md:bg-amber-100 text-amber-300 md:text-amber-700 border-amber-500/30 hover:bg-amber-500/30 md:hover:bg-amber-200"><Crown className="h-3 w-3 mr-1" /> Admin</Badge>}
                                           {member.role === 'moderator' && <Badge variant="secondary" className="text-[10px] h-5 bg-blue-500/20 md:bg-blue-100 text-blue-300 md:text-blue-700 border-blue-500/30 hover:bg-blue-500/30 md:hover:bg-blue-200"><ShieldCheck className="h-3 w-3 mr-1" /> Mod</Badge>}
                                        </div>
                                        <p className="text-xs text-gray-500">Entrou em {new Date(member.joined_at).toLocaleDateString()}</p>
                                      </div>
                                   </div>
                                   {isMod && member.user_id !== user?.id && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-gray-500 hover:text-white md:hover:text-black"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-gray-900 border-gray-800 text-white md:bg-white md:border-gray-200 md:text-black">
                                           <DropdownMenuItem className="text-red-400 focus:bg-red-900/20 focus:text-red-300 md:focus:bg-red-100 md:focus:text-red-700"><UserMinus className="h-4 w-4 mr-2" /> Banir Membro</DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                   )}
                                </div>
                              ))}
                           </CardContent>
                        </Card>
                      </TabsContent>

                      {/* --- SOBRE --- */}
                      <TabsContent value="about" className="mt-0">
                        <Card className="border-gray-800 md:border-gray-200 bg-gray-900/30 md:bg-gray-100">
                          <CardContent className="p-8 space-y-6">
                            <div>
                              <h3 className="font-bold text-lg mb-2 text-white md:text-black">Descrição</h3>
                              <p className="text-gray-400 md:text-gray-700 leading-relaxed">
                                {selectedCommunity.description || "Esta comunidade não possui uma descrição detalhada."}
                              </p>
                            </div>
                            <Separator className="bg-gray-800 md:bg-gray-300" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 md:bg-gray-200 border border-gray-800 md:border-gray-300">
                                  <div className="bg-blue-600/20 md:bg-blue-100 p-3 rounded-full text-blue-400 md:text-blue-600"><Users className="h-6 w-6" /></div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-400 md:text-gray-600">População</p>
                                    <p className="text-2xl font-bold text-white md:text-black">{members?.length}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 md:bg-gray-200 border border-gray-800 md:border-gray-300">
                                  <div className="bg-purple-600/20 md:bg-purple-100 p-3 rounded-full text-purple-400 md:text-purple-600"><MessageCircle className="h-6 w-6" /></div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-400 md:text-gray-600">Atividade</p>
                                    <p className="text-2xl font-bold text-white md:text-black">{communityPosts?.length} posts</p>
                                  </div>
                               </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                    </div>
                  </div>
               </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* --- DIALOGS (CRIAÇÃO) --- */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gray-950 md:bg-white border-gray-800 md:border-gray-200 text-white md:text-black p-0 rounded-2xl">
          <DialogHeader className="p-6 border-b border-gray-800 md:border-gray-200">
            <DialogTitle className="flex items-center gap-2">
               <Sparkles className="h-5 w-5 text-purple-500" /> 
               Criar Nova Comunidade
            </DialogTitle>
            <DialogDescription className="text-gray-400 md:text-gray-600">Construa um espaço incrível para as pessoas se conectarem.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 p-6">
             {/* Upload de Capa */}
             <div 
               className="h-36 w-full bg-gray-900/50 md:bg-gray-100 rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden group border-2 border-dashed border-gray-800 md:border-gray-300 hover:border-purple-500 transition-all"
               onClick={() => coverInputRef.current?.click()}
             >
                {newCommunity.coverUrl ? (
                  <img src={newCommunity.coverUrl} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="flex flex-col items-center text-gray-500 group-hover:text-purple-400 transition-colors">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-xs font-medium">Adicionar Capa</span>
                  </div>
                )}
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'cover')} />
             </div>

             {/* Upload de Avatar (Sobreposto) */}
             <div className="flex justify-center -mt-16 relative z-10">
                <div 
                   className="h-24 w-24 rounded-2xl bg-gray-950 md:bg-white border-4 border-gray-950 md:border-white flex items-center justify-center cursor-pointer relative overflow-hidden group shadow-xl"
                   onClick={() => avatarInputRef.current?.click()}
                >
                   {newCommunity.avatarUrl ? (
                     <img src={newCommunity.avatarUrl} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-gray-900 md:bg-gray-200 flex items-center justify-center group-hover:bg-gray-800 md:group-hover:bg-gray-300 transition-colors">
                        <Camera className="h-8 w-8 text-gray-500 group-hover:text-blue-400 transition-colors" />
                     </div>
                   )}
                   <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'avatar')} />
                </div>
             </div>

             <div className="grid gap-4">
               <div className="grid gap-2">
                 <Label className="text-gray-300 md:text-gray-700">Nome da Comunidade</Label>
                 <Input 
                   value={newCommunity.name} 
                   onChange={e => setNewCommunity({...newCommunity, name: e.target.value})} 
                   placeholder="Ex: Fotografia Urbana" 
                   className="bg-gray-900 md:bg-gray-100 border-gray-800 md:border-gray-300 text-white md:text-black focus:border-purple-500 focus:ring-purple-500/20"
                 />
               </div>
               <div className="grid gap-2">
                 <Label className="text-gray-300 md:text-gray-700">Descrição</Label>
                 <Textarea 
                   value={newCommunity.description} 
                   onChange={e => setNewCommunity({...newCommunity, description: e.target.value})} 
                   placeholder="Descreva o propósito do grupo..." 
                   className="bg-gray-900 md:bg-gray-100 border-gray-800 md:border-gray-300 text-white md:text-black focus:border-purple-500 focus:ring-purple-500/20 min-h-[100px]"
                 />
               </div>
               
               <div className="flex items-center justify-between p-4 border border-gray-800 md:border-gray-300 rounded-xl bg-gray-900/50 md:bg-gray-100">
                 <div className="space-y-0.5">
                   <Label className="text-gray-300 md:text-gray-700">Comunidade Privada</Label>
                   <p className="text-xs text-gray-500">Apenas quem tiver a senha poderá entrar.</p>
                 </div>
                 <Switch 
                   checked={newCommunity.isPrivate} 
                   onCheckedChange={checked => setNewCommunity({...newCommunity, isPrivate: checked})} 
                   className="data-[state=checked]:bg-purple-600"
                 />
               </div>

               {newCommunity.isPrivate && (
                 <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                   <Label className="text-gray-300 md:text-gray-700">Senha de Acesso</Label>
                   <Input 
                     type="password" 
                     value={newCommunity.password} 
                     onChange={e => setNewCommunity({...newCommunity, password: e.target.value})} 
                     className="bg-gray-900 md:bg-gray-100 border-gray-800 md:border-gray-300 text-white md:text-black"
                   />
                 </div>
               )}
             </div>
          </div>

          <DialogFooter className="p-6 border-t border-gray-800 md:border-gray-200 bg-gray-900/50 md:bg-gray-100">
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-gray-400 md:text-gray-600 hover:text-white md:hover:text-black hover:bg-white/5 md:hover:bg-gray-200">Cancelar</Button>
            <Button 
              onClick={handleCreateCommunity} 
              disabled={isUploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none hover:shadow-lg hover:shadow-purple-500/20"
            >
              {isUploading ? "Carregando..." : "Criar Comunidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG SENHA --- */}
      <Dialog open={!!showPasswordDialog} onOpenChange={() => setShowPasswordDialog(null)}>
        <DialogContent className="bg-gray-900 md:bg-white border-gray-800 md:border-gray-300 text-white md:text-black">
           <DialogHeader><DialogTitle>Senha Necessária</DialogTitle></DialogHeader>
           <Input 
             type="password" 
             placeholder="Digite a senha..." 
             value={joinPassword} 
             onChange={e => setJoinPassword(e.target.value)} 
             className="bg-black/50 md:bg-gray-100 border-gray-700 md:border-gray-300 text-white md:text-black"
           />
           <Button 
             onClick={() => showPasswordDialog && allCommunities && handleJoin(allCommunities.find(c => c.id === showPasswordDialog)!, joinPassword)}
             className="bg-blue-600 hover:bg-blue-700 text-white"
           >
             Entrar
           </Button>
        </DialogContent>
      </Dialog>

    </div>
  );
}