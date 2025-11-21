import { useState, useEffect } from "react";
import { Home, Search, MessageCircle, Users, User, Menu, X, LogOut, Copy, Check } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeatherWidget } from "@/components/WeatherWidget";
import { StealthModeToggle } from "@/components/StealthModeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadFeed } from "@/hooks/useUnreadFeed";
import { useUnreadCommunities } from "@/hooks/useUnreadCommunities";
import { useStealthMode } from "@/hooks/useStealthMode";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const unreadMessages = useUnreadMessages();
  const unreadFeed = useUnreadFeed();
  const unreadCommunities = useUnreadCommunities();
  const { config } = useStealthMode();

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

  const navigation = [
    { name: "Dissect", href: "/", icon: Home, badge: unreadFeed },
    { name: "Explorar", href: "/explore", icon: Search },
    { name: "Mensagens", href: "/messages", icon: MessageCircle, badge: unreadMessages },
    { name: "Bubbles", href: "/communities", icon: Users, badge: unreadCommunities },
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
          {/* Logo */}
          <div className="p-3 border-b flex-shrink-0">
            <img src={logo} alt="UndoinG" className="h-20 mx-auto" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                onClick={() => setSidebarOpen(false)}
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
            {/* Stealth Mode Toggle */}
            <div className="flex items-center gap-2">
              <StealthModeToggle />
              <ThemeToggle />
            </div>

            {/* UDG Code */}
            {profile?.friend_code ? (
              <Card className="p-2 bg-gradient-to-br from-primary/10 to-secondary/10">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Seu Código UDG</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background rounded px-2 py-1">
                    <p className="text-xs font-mono font-bold text-primary">
                      {profile.friend_code}
                    </p>
                  </div>
                  <Button 
                    onClick={copyCode} 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-2 bg-muted">
                <p className="text-xs text-muted-foreground">Carregando código UDG...</p>
              </Card>
            )}
            
            <WeatherWidget />
            
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

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        
        {/* Footer */}
        <footer className="border-t bg-card/50 backdrop-blur-sm py-4 mt-auto">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground">
              Copyright © 2025 RTR-Sistemas
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
