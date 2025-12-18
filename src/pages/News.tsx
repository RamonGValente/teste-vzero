import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Settings,
  Trash2,
  Heart,
  MessageCircle,
  UserPlus,
  User,
  AtSign,
  ArrowRight,
  Filter,
  Sparkles,
  RefreshCw,
  Zap,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tipos de notificação baseados no seu esquema
export type NotificationType = 
  | 'mention' 
  | 'like' 
  | 'comment' 
  | 'friend_request' 
  | 'attention_call' 
  | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

export default function News() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // --- Lógica de Notificações (Busca em múltiplas tabelas) ---
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      
      const allNotifications: Notification[] = [];

      // 1. Buscar Menções
      const { data: mentions } = await supabase
        .from('mentions')
        .select('*, profiles:user_id(username, avatar_url)')
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false });

      mentions?.forEach(m => {
        allNotifications.push({
          id: `mention-${m.id}`,
          type: 'mention',
          title: 'Menção',
          message: `${(m.profiles as any)?.username || 'Alguém'} mencionou você.`,
          is_read: m.is_read,
          created_at: m.created_at,
          metadata: { url: m.content_type === 'post' ? `/post/${m.content_id}` : '#' }
        });
      });

      // 2. Buscar Chamadas de Atenção
      const { data: calls } = await supabase
        .from('attention_calls')
        .select('*, profiles:sender_id(username, avatar_url)')
        .eq('receiver_id', user.id)
        .is('viewed_at', null);

      calls?.forEach(c => {
        allNotifications.push({
          id: `call-${c.id}`,
          type: 'attention_call',
          title: '🚨 Chamada de Atenção',
          message: `${(c.profiles as any)?.username || 'Alguém'} enviou um sinal para você!`,
          is_read: false,
          created_at: c.created_at,
          metadata: { url: '/messages' }
        });
      });

      return allNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  });

  // --- Mutation para Marcar como Lido (Resolve Erro 409) ---
  const markAsReadMutation = useMutation({
    mutationFn: async (notif: Notification) => {
      if (!user) return;

      // 1. Atualizar o registro específico se for menção
      if (notif.id.startsWith('mention-')) {
        await supabase
          .from('mentions')
          .update({ is_read: true })
          .eq('id', notif.id.replace('mention-', ''));
      }

      // 2. Atualizar last_viewed com UPSERT (Evita erro 409)
      const { error } = await supabase
        .from('last_viewed')
        .upsert({
          user_id: user.id,
          section: 'notifications',
          viewed_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id, section' 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleNotificationClick = (notif: Notification) => {
    markAsReadMutation.mutate(notif);
    if (notif.metadata?.url) navigate(notif.metadata.url);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'mention': return <AtSign className="h-4 w-4" />;
      case 'attention_call': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'like': return <Heart className="h-4 w-4 text-red-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Novidades</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setSettingsDialogOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">Não lidas</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma notificação por aqui.
              </div>
            ) : (
              <div className="divide-y">
                {notifications
                  .filter(n => activeTab === 'all' || !n.is_read)
                  .map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        !n.is_read && "bg-primary/5 border-l-4 border-primary"
                      )}
                    >
                      <div className="mt-1">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {getIcon(n.type)}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{n.title}</p>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground/60">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-20" />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Diálogo de Configurações */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={() => {
                setSettingsDialogOpen(false);
                setConfirmClearOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Histórico
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Limpeza */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tem a certeza?</DialogTitle>
            <DialogDescription>
              Esta ação marcará todas as notificações como lidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClearOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => setConfirmClearOpen(false)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}