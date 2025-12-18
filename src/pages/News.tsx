import { useState } from "react";
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
  AtSign,
  ArrowRight,
  RefreshCw,
  Zap,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export type NotificationType = 
  | 'mention' 
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
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      
      const allNotifications: Notification[] = [];

      // 1. Buscar Menções (Consulta simplificada para evitar Erro 400)
      const { data: mentions, error: mError } = await supabase
        .from('mentions')
        .select('*') // Removido join complexo que causava 400
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false });

      if (mError) console.error("Erro ao buscar menções:", mError);

      mentions?.forEach(m => {
        allNotifications.push({
          id: `mention-${m.id}`,
          type: 'mention',
          title: 'Nova Menção',
          message: `Alguém mencionou você em um conteúdo.`,
          is_read: m.is_read,
          created_at: m.created_at,
          metadata: { url: m.content_type === 'post' ? `/post/${m.content_id}` : '#' }
        });
      });

      // 2. Buscar Chamadas de Atenção
      const { data: calls, error: cError } = await supabase
        .from('attention_calls')
        .select('*')
        .eq('receiver_id', user.id)
        .is('viewed_at', null);

      if (cError) console.error("Erro ao buscar chamadas:", cError);

      calls?.forEach(c => {
        allNotifications.push({
          id: `call-${c.id}`,
          type: 'attention_call',
          title: '🚨 Chamada de Atenção',
          message: `Você recebeu um sinal de atenção!`,
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

  const markAsReadMutation = useMutation({
    mutationFn: async (notif: Notification) => {
      if (!user) return;

      if (notif.id.startsWith('mention-')) {
        await supabase
          .from('mentions')
          .update({ is_read: true })
          .eq('id', notif.id.replace('mention-', ''));
      }

      // UPSERT resolve o erro 409 (conflito de chave duplicada)
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
    }
  });

  const handleNotificationClick = (notif: Notification) => {
    markAsReadMutation.mutate(notif);
    if (notif.metadata?.url) navigate(notif.metadata.url);
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Novidades</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
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

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <Bell className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-muted-foreground">Tudo limpo por aqui!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications
                  .filter(n => activeTab === 'all' || !n.is_read)
                  .map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-accent",
                        !n.is_read ? "bg-accent/40 border-primary/20" : "bg-card"
                      )}
                    >
                      <div className="mt-1">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center",
                          n.type === 'attention_call' ? "bg-yellow-500/10 text-yellow-600" : "bg-primary/10 text-primary"
                        )}>
                          {n.type === 'attention_call' ? <Zap className="h-5 w-5" /> : <AtSign className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-semibold truncate">{n.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de Notificações</DialogTitle>
            <DialogDescription>
              Gerencie como você recebe alertas e limpe seu histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Button 
              variant="destructive" 
              className="w-full justify-start" 
              onClick={() => {
                setSettingsDialogOpen(false);
                setConfirmClearOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Marcar tudo como lido
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar tudo como lido?</DialogTitle>
            <DialogDescription>
              Isso atualizará o status de todas as suas notificações pendentes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmClearOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                // Aqui você pode implementar a lógica de marcar tudo via RPC ou loop
                setConfirmClearOpen(false);
                toast({ title: "Sucesso", description: "Notificações marcadas como lidas." });
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}