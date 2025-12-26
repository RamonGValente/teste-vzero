import { useState, useEffect } from "react";
import { Bomb, Check, Copy, Crown, Home, LogOut, Menu, Lock, Search, User, Users, X, Zap, Globe, Swords, Newspaper } from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { WeatherWidget } from "@/components/WeatherWidget";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadFeed } from "@/hooks/useUnreadFeed";
import { useUnreadCommunities } from "@/hooks/useUnreadCommunities";
import { useUdgRanking } from "@/hooks/useUdgRanking";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adName, setAdName] = useState("");
  const [adPhone, setAdPhone] = useState("");
  const [adEmail, setAdEmail] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adSubmitting, setAdSubmitting] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Usar hook customizado para mensagens não lidas - agora com markAsRead
  const { unreadCount: unreadMessages, markAsRead } = useUnreadMessages();
  const unreadFeed = useUnreadFeed();
  const unreadCommunities = useUnreadCommunities();

  // Usar o hook melhorado para ranking UDG
  const { king, bombado } = useUdgRanking();

  // Zerar contador de mensagens quando estiver na página de mensagens
  useEffect(() => {
    if (location.pathname === '/messages') {
      markAsRead();
    }
  }, [location.pathname, markAsRead]);

  const { data: profile } = useQuery({
    queryKey: ["user-profile-sidebar", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("friend_code")
        .eq("id", user!.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    },
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("king-mode", "bombado-mode");

    if (!king && !bombado) return;

    if (user?.id && king?.userId === user.id) {
      root.classList.add("king-mode");
    } else if (user?.id && bombado?.userId === user.id) {
      root.classList.add("bombado-mode");
    }
  }, [king, bombado, user?.id]);

  const handleAdSubmit = async () => {
    if (!adName || !adEmail || !adDescription) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pelo menos nome, e-mail e descrição.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdSubmitting(true);

      let imageUrl: string | null = null;
      if (adImage) {
        const ext = adImage.name.split(".").pop() || "jpg";
        const path = `ads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, adImage);

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("media").getPublicUrl(path);
          imageUrl = publicData.publicUrl;
        }
      }

      const bodyLines = [
        "Novo pedido de anúncio via UndoinG:",
        "",
        `Nome/Empresa: ${adName}`,
        `Telefone: ${adPhone || "-"}`,
        `E-mail: ${adEmail}`,
        "",
        "Sobre o anunciante:",
        adDescription,
        "",
        imageUrl ? `Imagem: ${imageUrl}` : "",
      ].filter(Boolean);

      const mailto = `mailto:sistemasrtr@gmail.com?subject=${encodeURIComponent(
        "Novo anúncio - " + adName
      )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

      window.location.href = mailto;

      toast({
        title: "Proposta de anúncio preparada",
        description: "Abrimos seu e-mail com os dados preenchidos. É só enviar para concluir.",
      });

      setAdModalOpen(false);
      setAdName("");
      setAdPhone("");
      setAdEmail("");
      setAdDescription("");
      setAdImage(null);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao preparar anúncio",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setAdSubmitting(false);
    }
  };

  const navigation = [
    { name: "World Flow", href: "/", icon: Globe, badge: unreadFeed },
    { name: "Explorar", href: "/explore", icon: Search },
    { name: "Chat-Privado", href: "/messages", icon: Lock, badge: unreadMessages },
    { name: "Bubbles", href: "/communities", icon: Users, badge: unreadCommunities },
    { name: "Arena", href: "/arena", icon: Swords },
    { name: "Rankings", href: "/rankings", icon: Zap },
    { name: "Notificador", href: "/news", icon: Newspaper },
    { name: "Perfil", href: "/profile", icon: User },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const copyCode = () => {
    if (profile?.friend_code) {
      // Copia apenas os números (remove "UDG-")
      const numbersOnly = profile.friend_code.replace('UDG-', '');
      navigator.clipboard.writeText(numbersOnly);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Código copiado!",
        description: `${numbersOnly} copiado para área de transferência`,
      });
    }
  };

  const handleMessagesClick = () => {
    setSidebarOpen(false);
    markAsRead();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Hamburger Button - Always visible on mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg transition-all",
          "bg-card border hover:bg-accent",
          sidebarOpen && "opacity-0 pointer-events-none"
        )}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out",
          "border-r bg-card shadow-lg",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                onClick={item.href === "/messages" ? handleMessagesClick : () => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    "hover:bg-primary/10",
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-primary font-medium"
                      : "text-muted-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-2 border-t space-y-2 flex-shrink-0">
            <WeatherWidget />

            {/* Ranking UDG */}
            {king && (
              <Card
                className="mt-3 p-2 bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-400/20 border border-yellow-500/50 shadow-sm cursor-pointer"
                onClick={() => navigate(`/profile/${king.userId}`)}
              >
                <p className="text-[11px] font-bold mb-1 tracking-wide text-yellow-600 flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  REI-UDG
                </p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border-2 border-yellow-400">
                    <AvatarImage src={king.avatar_url || undefined} />
                    <AvatarFallback className="bg-yellow-500 text-xs font-bold text-black">
                      {king.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {king.username || "Usuário"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {king.heartsTotal} ❤️ · {king.bombsTotal} 💣
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {bombado && (
              <Card
                className="mt-2 p-2 bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 border border-slate-700 shadow-sm cursor-pointer"
                onClick={() => navigate(`/profile/${bombado.userId}`)}
              >
                <p className="text-[11px] font-bold mb-1 tracking-wide text-red-500 flex items-center gap-1">
                  <Bomb className="h-3 w-3" />
                  Bombado
                </p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border-2 border-slate-500">
                    <AvatarImage src={bombado.avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-600 text-xs font-bold text-white">
                      {bombado.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {bombado.username || "Usuário"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {bombado.heartsTotal} ❤️ · {bombado.bombsTotal} 💣
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Espaço para anúncios */}
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Card
                className="h-16 flex items-center justify-center border-dashed border-2 border-primary cursor-pointer hover:bg-primary/5 transition"
                onClick={() => setAdModalOpen(true)}
              >
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Anuncie aqui
                </p>
              </Card>
              <Card
                className="h-16 flex items-center justify-center border-dashed border border-muted-foreground/40 cursor-pointer hover:bg-muted/60 transition"
                onClick={() => setAdModalOpen(true)}
              >
                <p className="text-[11px] text-muted-foreground text-center px-2">
                  Espaço reservado para parceiros e campanhas especiais
                </p>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {user?.user_metadata?.username || user?.email?.split("@")[0]}
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full h-8"
            >
              <LogOut className="h-3 w-3 mr-2" />
              <span className="text-xs">Sair</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content     */}
      <main className="lg:ml-72 min-h-screen flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        
        {/* Footer - Renderizado apenas se NÃO for Feed ("/") e NÃO for Arena ("/arena") */}
        {location.pathname !== "/" && location.pathname !== "/arena" && (
          <footer className="border-t bg-card/50 backdrop-blur-sm py-4 mt-auto">
            <div className="container mx-auto px-4">
              <p className="text-center text-sm text-muted-foreground">
                Copyright © 2025 RTR-Sistemas
              </p>
            </div>
          </footer>
        )}
      </main>

      <Dialog open={adModalOpen} onOpenChange={setAdModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quero anunciar na UndoinG</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo. Nosso time analisará sua proposta e entrará em contato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nome ou Empresa</label>
              <input
                className="w-full rounded-md border px-2 py-1 text-xs bg-background"
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                placeholder="Ex: RTR Sistemas"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Telefone ou celular</label>
                <input
                  className="w-full rounded-md border px-2 py-1 text-xs bg-background"
                  value={adPhone}
                  onChange={(e) => setAdPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">E-mail</label>
                <input
                  className="w-full rounded-md border px-2 py-1 text-xs bg-background"
                  value={adEmail}
                  onChange={(e) => setAdEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Conte-nos sobre você</label>
              <textarea
                className="w-full rounded-md border px-2 py-1 text-xs bg-background min-h-[80px]"
                value={adDescription}
                onChange={(e) => setAdDescription(e.target.value)}
                placeholder="Explique brevemente seu negócio, público e tipo de anúncio desejado."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Imagem do anúncio (1 imagem)</label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-xs"
                onChange={(e) => setAdImage(e.target.files?.[0] ?? null)}
              />
              <p className="text-[10px] text-muted-foreground">
                A imagem será enviada junto à sua proposta de anúncio.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdSubmit}
              disabled={adSubmitting}
            >
              {adSubmitting ? "Enviando..." : "Enviar proposta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}