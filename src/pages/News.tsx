import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  Settings,
  Trash2,
  Heart,
  MessageCircle,
  UserPlus,
  User,
  AtSign,
  Users,
  ArrowRight,
  Filter,
  Shield,
  Crown,
  TrendingUp,
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
import { Switch } from "@/components/ui/switch";
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

// ============================================
// TIPOS
// ============================================

export type NotificationType = 
  | 'mention'
  | 'like'
  | 'comment'
  | 'follow'
  | 'follow_request'
  | 'friend_request_accepted'
  | 'post_approved'
  | 'post_rejected'
  | 'community_invite'
  | 'community_mention'
  | 'attention_call'
  | 'message'
  | 'trending'
  | 'system'
  | 'achievement';

export interface Notification {
  id: string;
  type: NotificationType;
  user_id: string;
  target_user_id?: string;
  target_id?: string;
  target_type?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  is_muted: boolean;
  created_at: string;
  expires_at?: string;
  metadata?: {
    sender_username?: string;
    sender_avatar?: string;
    post_content?: string;
    community_name?: string;
    badge?: string;
    url?: string;
    [key: string]: any;
  };
}

export default function News() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions' | 'social' | 'system'>('all');
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Push states
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const notificationSound = useRef<HTMLAudioElement>(null);

  // ============================================
  // FUNÇÕES DE PUSH NOTIFICATIONS
  // ============================================

  // Converter chave VAPID
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Registrar Service Worker
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      toast({
        title: "Navegador não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return null;
    }

    setIsRegistering(true);
    try {
      // Importante: verificar o caminho exato do seu sw.js na pasta public
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      setServiceWorker(registration);
      console.log('✅ Service Worker registrado:', registration);
      
      // Aguardar ativação
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing!.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              resolve();
            }
          });
        });
      }
      
      toast({ 
        title: "Service Worker ativado!",
        description: "Pronto para receber notificações push."
      });
      
      return registration;
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
      return null;
    } finally {
      setIsRegistering(false);
    }
  };

  // Solicitar permissão para notificações push
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      return;
    }

    try {
      let registration = serviceWorker;
      if (!registration) {
        registration = await registerServiceWorker();
        if (!registration) return;
      }

      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        toast({ 
          title: "🎉 Permissão concedida!",
          description: "Você agora receberá notificações push."
        });
        
        await subscribeToPush(registration);
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    }
  };

  // Inscrever-se para push notifications
  const subscribeToPush = async (registration: ServiceWorkerRegistration) => {
    try {
      const vapidPublicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();

      if (!vapidPublicKey) {
        toast({
          title: "Configuração ausente",
          description: "VITE_VAPID_PUBLIC_KEY não encontrada no .env",
          variant: "destructive",
        });
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Enviar subscription para o servidor
      const success = await sendSubscriptionToServer(subscription);
      
      if (success) {
        setIsSubscribed(true);
        toast({ 
          title: "✅ Inscrito com sucesso!",
          description: "Você agora receberá notificações push."
        });
      }
    } catch (error: any) {
      console.error('Erro ao inscrever-se para push:', error);
      toast({
        title: "Erro na inscrição",
        description: error.message || "Não foi possível completar a inscrição.",
        variant: "destructive",
      });
    }
  };

  // Enviar subscription para o servidor
  const sendSubscriptionToServer = async (subscription: PushSubscription): Promise<boolean> => {
    try {
      if (!user) return false;

      const key = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
        keys_p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : null,
        keys_auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : null,
      };

      // Tenta inserir na tabela push_subscriptions
      // OBS: Endpoint não é unique no schema original, então insert pode duplicar se não tratar.
      // O ideal é checar antes.
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', subscription.endpoint)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
          // Atualiza se necessário
          await supabase
            .from('push_subscriptions')
            .update(subscriptionData)
            .eq('id', existing.id);
      } else {
          // Insere novo
          const { error } = await supabase
            .from('push_subscriptions')
            .insert(subscriptionData);
          
          if (error) {
            console.error('Supabase insert error:', error);
            throw error;
          }
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar subscription:', error);
      return false;
    }
  };

  // Cancelar inscrição
  const unsubscribeFromPush = async () => {
    if (!serviceWorker) return;

    try {
      const subscription = await serviceWorker.pushManager.getSubscription();
      if (subscription) {
        const success = await subscription.unsubscribe();
        if (success) {
          setIsSubscribed(false);
          toast({ title: "✅ Inscrição cancelada!" });
          
          // Remover do servidor
          if (user) {
             await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
    }
  };

  // Testar notificação push
  const testPushNotification = async () => {
    if (!user || !isSubscribed) {
      toast({
        title: "Ação necessária",
        description: "Inscreva-se primeiro para testar.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({ title: "Enviando teste..." });

      // Chama a função Netlify
      const response = await fetch('/.netlify/functions/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: '🔔 Teste World Flow',
          body: 'Se você está vendo isso, o Push está funcionando!',
          icon: '/icon-192.png',
          url: '/news',
          tag: 'test-notification',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || "Erro desconhecido");
      }

      toast({
        title: "✅ Sucesso",
        description: `Enviado: ${result.sent}. Verifique seu dispositivo.`,
      });

    } catch (error: any) {
      console.error('Erro no teste:', error);
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Inicializar
  useEffect(() => {
    const initPushNotifications = async () => {
      if (!('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        setServiceWorker(registration);

        if ('Notification' in window) {
          setPushPermission(Notification.permission);
        }

        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

      } catch (error) {
        console.error('Erro na inicialização:', error);
      }
    };

    initPushNotifications();
  }, []);

  // ============================================
  // QUERIES E MUTATIONS
  // ============================================

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      try {
        const notifications: Notification[] = [];
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 1. Mentions
        const { data: mentions } = await supabase
          .from('mentions')
          .select('*, profiles!mentions_user_id_fkey(username, avatar_url)') // Join correto via FK
          .eq('mentioned_user_id', user.id)
          .gte('created_at', oneWeekAgo.toISOString())
          .order('created_at', { ascending: false });

        mentions?.forEach((m: any) => {
           notifications.push({
            id: `mention_${m.id}`,
            type: 'mention',
            user_id: user.id,
            title: '📌 Você foi mencionado',
            message: `${m.profiles?.username || 'Alguém'} mencionou você`,
            is_read: m.is_read || false,
            is_muted: false,
            created_at: m.created_at,
            metadata: {
              sender_username: m.profiles?.username,
              sender_avatar: m.profiles?.avatar_url,
              url: `/${m.content_type === 'post' ? 'post' : 'comment'}/${m.content_id}`,
            },
           });
        });

        // 2. Friend Requests (sem join direto se causar erro, mas tentando via FK)
        const { data: friendRequests } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        if (friendRequests && friendRequests.length > 0) {
            // Busca profiles manualmente para evitar erros complexos de FK se houver ambiguidade
            const senderIds = friendRequests.map(r => r.sender_id);
            const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', senderIds);
            
            friendRequests.forEach(req => {
                const sender = profiles?.find(p => p.id === req.sender_id);
                notifications.push({
                    id: `fr_${req.id}`,
                    type: 'friend_request',
                    user_id: user.id,
                    title: 'Pedigo de Amizade',
                    message: `${sender?.username || 'Alguém'} quer ser seu amigo`,
                    is_read: false, 
                    is_muted: false,
                    created_at: req.created_at,
                    metadata: {
                        sender_username: sender?.username,
                        sender_avatar: sender?.avatar_url,
                        url: '/messages?tab=requests'
                    }
                });
            });
        }

        // 3. Attention Calls
        const { data: attentionCalls } = await supabase
          .from('attention_calls')
          .select('*, profiles!attention_calls_sender_id_fkey(username, avatar_url)')
          .eq('receiver_id', user.id)
          .is('viewed_at', null);

        attentionCalls?.forEach((call: any) => {
          notifications.push({
            id: `attention_${call.id}`,
            type: 'attention_call',
            user_id: user.id,
            target_user_id: call.sender_id,
            title: '🚨 Chamada de atenção!',
            message: `${call.profiles?.username || 'Alguém'} está chamando sua atenção`,
            is_read: false,
            is_muted: false,
            created_at: call.created_at,
            metadata: {
              sender_username: call.profiles?.username,
              sender_avatar: call.profiles?.avatar_url,
              url: '/messages',
            },
          });
        });

        // Ordenar
        return notifications.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
      }
    }
  });

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.is_read).length);
  }, [notifications]);

  // ✅ CORREÇÃO DO ERRO 409 (Conflict) NO LAST_VIEWED
  const markAsReadMutation = useMutation({
    mutationFn: async (notification: Notification) => {
        if (!user) return;
        
        // Se for mention, atualiza tabela mentions
        if (notification.type === 'mention' && notification.id.startsWith('mention_')) {
            const rawId = notification.id.replace('mention_', '');
            await supabase.from('mentions').update({ is_read: true }).eq('id', rawId);
        }

        // Atualiza last_viewed usando UPSERT
        const { error } = await supabase
          .from('last_viewed')
          .upsert(
            { 
                user_id: user.id, 
                section: 'notifications', // ou 'messages' dependendo do contexto
                viewed_at: new Date().toISOString() 
            },
            { onConflict: 'user_id, section' as any } // Ignora erro de chave duplicada
          );

        if (error) console.error("Erro no upsert last_viewed:", error);
    },
    onSuccess: () => {
      refetch(); // Recarrega lista
    }
  });

  // Limpar
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      // Exemplo: marcar todas mentions como lidas
      if(user) {
        await supabase.from('mentions').update({ is_read: true }).eq('mentioned_user_id', user.id);
      }
      return true;
    },
    onSuccess: () => {
      toast({ title: "Notificações limpas!" });
      refetch();
    }
  });

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getIconByType = (type: NotificationType) => {
    switch (type) {
      case 'mention': return <AtSign className="h-4 w-4" />;
      case 'like': return <Heart className="h-4 w-4" />;
      case 'comment': return <MessageCircle className="h-4 w-4" />;
      case 'follow': return <UserPlus className="h-4 w-4" />;
      case 'friend_request': return <User className="h-4 w-4" />;
      case 'attention_call': return <Zap className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread' && n.is_read) return false;
    if (activeTab === 'mentions' && n.type !== 'mention') return false;
    if (activeTab === 'social' && !['like', 'comment', 'follow', 'friend_request'].includes(n.type)) return false;
    if (activeTab === 'system' && !['system', 'attention_call'].includes(n.type)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(n.type)) return false;
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Notificações</h1>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} não lidas</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>

          <Button
            variant="outline"
            onClick={() => setConfirmClearOpen(true)}
            disabled={isLoading || notifications.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">Não lidas</TabsTrigger>
          <TabsTrigger value="mentions">Menções</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-2">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Tipos</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {['mention', 'like', 'comment', 'friend_request', 'attention_call'].map((t: any) => (
                    <DropdownMenuCheckboxItem
                        key={t}
                        checked={selectedTypes.includes(t)}
                        onCheckedChange={(checked) => {
                        setSelectedTypes((prev) => checked ? [...prev, t] : prev.filter((x) => x !== t));
                        }}
                    >
                        {t}
                    </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedTypes([])}>Limpar filtros</DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center gap-2">
                {pushPermission === 'granted' && isSubscribed ? (
                    <Button variant="outline" size="sm" onClick={testPushNotification}>
                        <Sparkles className="h-4 w-4 mr-2" /> Testar
                    </Button>
                ) : (
                    <Button size="sm" onClick={requestPushPermission}>
                        Ativar Push
                    </Button>
                )}
            </div>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma notificação encontrada.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((n) => (
                    <button
                      key={n.id}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition hover:bg-muted/50",
                        !n.is_read && "border-primary/40 bg-primary/5"
                      )}
                      onClick={() => {
                        markAsReadMutation.mutate(n);
                        if(n.metadata?.url) navigate(n.metadata.url);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted",
                          !n.is_read && "bg-primary/10"
                        )}>
                          {getIconByType(n.type)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{n.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {n.message}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de Notificação</DialogTitle>
            <DialogDescription>Gerencie suas preferências de push.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="flex items-center justify-between">
                <span>Status Push:</span>
                <Badge variant={isSubscribed ? "default" : "destructive"}>
                    {isSubscribed ? "Ativado" : "Desativado"}
                </Badge>
             </div>
             
             {isSubscribed && (
                 <Button variant="destructive" className="w-full" onClick={unsubscribeFromPush}>
                     Desativar Notificações
                 </Button>
             )}
          </div>
        </DialogContent>
      </Dialog>

       {/* Clear Dialog */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Limpar tudo?</DialogTitle></DialogHeader>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setConfirmClearOpen(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={() => { clearAllMutation.mutate(); setConfirmClearOpen(false); }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}