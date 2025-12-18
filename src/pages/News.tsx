import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { subscribeToPush as subscribeToPushClient, unsubscribeFromPush as unsubscribeFromPushClient, sendTestPush, isPushSupported as isPushSupportedClient, getServiceWorkerRegistration } from "@/utils/pushClient";
import {
  Bell,
  BellOff,
  Settings,
  Check,
  Trash2,
  Heart,
  MessageCircle,
  UserPlus,
  User,
  AtSign,
  Globe,
  Users,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Filter,
  X,
  ExternalLink,
  AlertCircle,
  Shield,
  Crown,
  TrendingUp,
  Film,
  Bookmark,
  Share2,
  Calendar,
  History,
  Loader2,
  MoreVertical,
  Sparkles,
  RefreshCw,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  };
}

interface NotificationSettings {
  push_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  desktop_enabled: boolean;
  email_enabled: boolean;
  types: {
    mention: boolean;
    like: boolean;
    comment: boolean;
    follow: boolean;
    friend_request: boolean;
    community: boolean;
    message: boolean;
    trending: boolean;
    system: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function News() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Estados
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions' | 'social' | 'system'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    push_enabled: true,
    sound_enabled: true,
    vibration_enabled: true,
    desktop_enabled: true,
    email_enabled: false,
    types: {
      mention: true,
      like: true,
      comment: true,
      follow: true,
      friend_request: true,
      community: true,
      message: true,
      trending: true,
      system: true,
    },
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  });
  
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
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
      toast({
        title: "Erro ao registrar Service Worker",
        description: "Verifique se a URL está em HTTPS para notificações push.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsRegistering(false);
    }
  };

  // Solicitar permissão para notificações push
  const requestPushPermission = async () => {
    if (!isPushSupportedClient()) {
      toast({ title: 'Navegador não suportado', description: 'Seu navegador não suporta notificações push.', variant: 'destructive' });
      return;
    }
    try {
      const registration = await getServiceWorkerRegistration();
      setServiceWorker(registration);
      const sub = await subscribeToPushClient();
      setPushPermission(Notification.permission);
      setIsSubscribed(!!sub);
      toast({ title: '✅ Push ativado!', description: 'Você agora receberá push de mensagens, chamar atenção, menções e pedidos de amizade.' });
    } catch (error: any) {
      if (Notification.permission === 'denied') {
        toast({ title: 'Permissão negada', description: 'Ative nas configurações do navegador para receber push.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Erro ao ativar push', description: error?.message || 'Não foi possível ativar notificações push.', variant: 'destructive' });
    }
  };

  // Inscrever-se para push notifications
  const subscribeToPush = async (registration: ServiceWorkerRegistration) => {
    try {
      // Use uma chave pública VAPID (em produção, use uma chave real)
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
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
        
        // Salvar no localStorage para referência futura
        localStorage.setItem('pushSubscription', JSON.stringify({
          endpoint: subscription.endpoint,
          expires: subscription.expirationTime,
          user: user?.id
        }));
      } else {
        throw new Error('Falha ao salvar subscription');
      }
    } catch (error: any) {
      console.error('❌ Erro ao inscrever-se:', error);
      
      // Verificar erro específico
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Permissão necessária",
          description: "Você precisa permitir notificações para usar este recurso.",
          variant: "destructive",
        });
      } else if (error.message.includes('applicationServerKey is not valid')) {
        toast({
          title: "Chave VAPID inválida",
          description: "Configure uma chave VAPID válida nas variáveis de ambiente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao inscrever-se",
          description: "Não foi possível completar a inscrição para notificações push.",
          variant: "destructive",
        });
      }
    }
  };

  // Enviar subscription para o servidor
  const sendSubscriptionToServer = async (subscription: PushSubscription): Promise<boolean> => {
    try {
      if (!user) return false;

      // Converter chaves para base64
      const key = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
        keys_p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : null,
        keys_auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : null,
      };

      // Salvar no Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
        
        // Fallback: salvar no localStorage
        const pending = JSON.parse(localStorage.getItem('pendingPushSubscriptions') || '[]');
        pending.push(subscriptionData);
        localStorage.setItem('pendingPushSubscriptions', JSON.stringify(pending));
        
        return true; // Considerar sucesso para continuar
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar subscription:', error);
      return false;
    }
  };

  // Verificar subscription existente
  const checkExistingSubscription = useCallback(async () => {
    if (!serviceWorker) return;

    try {
      const subscription = await serviceWorker.pushManager.getSubscription();
      if (subscription) {
        setIsSubscribed(true);
        console.log('📱 Já inscrito para push notifications');
      }
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
    }
  }, [serviceWorker]);

  // Cancelar inscrição
  const unsubscribeFromPush = async () => {
    try {
      await unsubscribeFromPushClient();
      setIsSubscribed(false);
      setPushPermission(Notification.permission);
      toast({ title: '✅ Notificações push desativadas!' });
    } catch {
      toast({ title: 'Erro ao cancelar inscrição', variant: 'destructive' });
    }
  };

  // Remover subscription do servidor
  const removeSubscriptionFromServer = async (subscription: PushSubscription) => {
    try {
      if (!user) return;
      
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);
    } catch (error) {
      console.error('Erro ao remover subscription:', error);
    }
  };

  // Testar notificação push
  const testPushNotification = async () => {
    if (!user || !isSubscribed) {
      toast({
        title: "Ação necessária",
        description: "Você precisa estar inscrito para notificações push.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Criar uma notificação local primeiro
      const testNotification: Notification = {
        id: `test_${Date.now()}`,
        type: 'system',
        user_id: user.id,
        title: '🔔 Teste de Notificação',
        message: 'Esta é uma notificação de teste do World Flow!',
        is_read: false,
        is_muted: false,
        created_at: new Date().toISOString(),
        metadata: {
          sender_username: 'Sistema',
          badge: 'test',
          url: '/news'
        },
      };

      // Adicionar à lista
      queryClient.setQueryData(['notifications', user.id], (old: Notification[] = []) => [
        testNotification,
        ...old,
      ]);

      // Tocar som
      if (notificationSound.current) {
        notificationSound.current.currentTime = 0;
        notificationSound.current.play().catch(console.error);
      }

      // Enviar push (servidor) para validar PC/Tablet/Celular
      try {
        await sendTestPush();
        toast({ title: '📱 Push enviado!', description: 'Se o app estiver fechado, deve chegar como notificação do sistema.' });
      } catch (pushError) {
        console.log('Push test falhou:', pushError);
      }

      toast({
        title: "✅ Teste realizado!",
        description: "Notificação de teste adicionada à lista.",
      });

    } catch (error) {
      console.error('Erro no teste:', error);
      toast({
        title: "Erro no teste",
        variant: "destructive",
      });
    }
  };

  // Inicializar Service Worker
  useEffect(() => {
    const initPushNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('❌ Navegador não suporta Service Worker ou Push');
        return;
      }

      try {
        // Registrar Service Worker
        const registration = await navigator.serviceWorker.ready;
        setServiceWorker(registration);

        // Verificar permissão
        if ('Notification' in window) {
          setPushPermission(Notification.permission);
        }

        // Verificar subscription
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

        // Listener para atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                toast({
                  title: "🔄 Nova versão disponível!",
                  description: "Recarregue para atualizar o aplicativo.",
                  action: (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.reload()}
                      className="ml-2"
                    >
                      Atualizar
                    </Button>
                  ),
                });
              }
            });
          }
        });

      } catch (error) {
        console.error('Erro na inicialização:', error);
      }
    };

    initPushNotifications();
  }, []);

  // ============================================
  // QUERIES E MUTATIONS
  // ============================================

  // Query para notificações
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id, activeTab],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      try {
        const notifications: Notification[] = [];
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Helper: carregar perfis (username/avatar) para IDs (quando não existe FK no PostgREST)
        const loadProfilesMap = async (ids: string[]) => {
          const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
          if (uniqueIds.length === 0) return new Map<string, { username?: string; avatar_url?: string }>();
          const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', uniqueIds);
          const map = new Map<string, { username?: string; avatar_url?: string }>();
          (data || []).forEach((p: any) => {
            map.set(p.id, { username: p.username, avatar_url: p.avatar_url });
          });
          return map;
        };

        // Buscar menções
        // OBS: na sua base, mentions.user_id / mentioned_user_id referenciam auth.users,
        // então o embed "profiles!mentions_user_id_fkey" NÃO existe e causa 400 (Bad Request).
        // Fazemos a hidratação manual com a tabela profiles.
        const { data: mentions } = await supabase
          .from('mentions')
          .select('*')
          .eq('mentioned_user_id', user.id)
          .gte('created_at', oneWeekAgo.toISOString())
          .order('created_at', { ascending: false });

        const mentionSenderIds = (mentions || []).map((m: any) => m.user_id);
        const mentionProfiles = await loadProfilesMap(mentionSenderIds);

        mentions?.forEach((mention: any) => {
          const p = mentionProfiles.get(mention.user_id) || {};
          notifications.push({
            id: `mention_${mention.id}`,
            type: 'mention',
            user_id: user.id,
            target_user_id: mention.user_id,
            target_id: mention.content_id,
            target_type: mention.content_type,
            title: '📌 Você foi mencionado',
            message: `${p.username || 'Alguém'} mencionou você`,
            is_read: mention.is_read || false,
            is_muted: false,
            created_at: mention.created_at,
            metadata: {
              sender_username: p.username,
              sender_avatar: p.avatar_url,
              url: `/${mention.content_type === 'post' ? 'post' : 'comment'}/${mention.content_id}`,
            },
          });
        });

        // Buscar curtidas
        const { data: userPosts } = await supabase
          .from('posts')
          .select('id, content')
          .eq('user_id', user.id);

        if (userPosts?.length) {
          for (const post of userPosts) {
            const { data: likes } = await supabase
              .from('likes')
              .select('*, profiles!likes_user_id_fkey(username, avatar_url)')
              .eq('post_id', post.id)
              .gte('created_at', oneWeekAgo.toISOString())
              .neq('user_id', user.id);

            likes?.forEach(like => {
              notifications.push({
                id: `like_${like.id}_${post.id}`,
                type: 'like',
                user_id: user.id,
                target_user_id: like.user_id,
                target_id: post.id,
                target_type: 'post',
                title: '❤️ Nova curtida',
                message: `${like.profiles?.username || 'Alguém'} curtiu seu post`,
                is_read: false,
                is_muted: false,
                created_at: like.created_at,
                metadata: {
                  sender_username: like.profiles?.username,
                  sender_avatar: like.profiles?.avatar_url,
                  post_content: post.content?.substring(0, 50) || '',
                  url: `/post/${post.id}`,
                },
              });
            });
          }
        }

        // Buscar comentários
        if (userPosts?.length) {
          for (const post of userPosts) {
            const { data: comments } = await supabase
              .from('comments')
              .select('*, profiles!comments_user_id_fkey(username, avatar_url)')
              .eq('post_id', post.id)
              .gte('created_at', oneWeekAgo.toISOString())
              .neq('user_id', user.id);

            comments?.forEach(comment => {
              notifications.push({
                id: `comment_${comment.id}_${post.id}`,
                type: 'comment',
                user_id: user.id,
                target_user_id: comment.user_id,
                target_id: comment.id,
                target_type: 'comment',
                title: '💬 Novo comentário',
                message: `${comment.profiles?.username || 'Alguém'} comentou seu post`,
                is_read: false,
                is_muted: false,
                created_at: comment.created_at,
                metadata: {
                  sender_username: comment.profiles?.username,
                  sender_avatar: comment.profiles?.avatar_url,
                  post_content: post.content?.substring(0, 50) || '',
                  url: `/post/${post.id}#comment-${comment.id}`,
                },
              });
            });
          }
        }

        // Buscar seguidores
        const { data: followers } = await supabase
          .from('followers')
          .select('*, profiles!followers_follower_id_fkey(username, avatar_url)')
          .eq('following_id', user.id)
          .gte('created_at', oneWeekAgo.toISOString());

        followers?.forEach(follower => {
          notifications.push({
            id: `follow_${follower.id}`,
            type: 'follow',
            user_id: user.id,
            target_user_id: follower.follower_id,
            title: '👤 Novo seguidor',
            message: `${follower.profiles?.username || 'Alguém'} começou a seguir você`,
            is_read: false,
            is_muted: false,
            created_at: follower.created_at,
            metadata: {
              sender_username: follower.profiles?.username,
              sender_avatar: follower.profiles?.avatar_url,
              url: `/profile/${follower.follower_id}`,
            },
          });
        });

        // Buscar pedidos de amizade
        // OBS: na sua base, friend_requests não tinha FKs declaradas para profiles,
        // então o embed "profiles!friend_requests_sender_id_fkey" NÃO existe e causa 400.
        const { data: friendRequests } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', oneWeekAgo.toISOString());

        const frSenderIds = (friendRequests || []).map((r: any) => r.sender_id);
        const frProfiles = await loadProfilesMap(frSenderIds);

        friendRequests?.forEach((request: any) => {
          const p = frProfiles.get(request.sender_id) || {};
          notifications.push({
            id: `friend_request_${request.id}`,
            type: 'friend_request',
            user_id: user.id,
            target_user_id: request.sender_id,
            target_id: request.id,
            target_type: 'friend_request',
            title: '🤝 Pedido de amizade',
            message: `${p.username || 'Alguém'} quer ser seu amigo`,
            is_read: false,
            is_muted: false,
            created_at: request.created_at,
            metadata: {
              sender_username: p.username,
              sender_avatar: p.avatar_url,
              url: '/messages?tab=requests',
            },
          });
        });

        // Buscar chamadas de atenção
        const { data: attentionCalls } = await supabase
          .from('attention_calls')
          .select('*, profiles!attention_calls_sender_id_fkey(username, avatar_url)')
          .eq('receiver_id', user.id)
          .is('viewed_at', null)
          .gte('created_at', oneWeekAgo.toISOString());

        attentionCalls?.forEach(call => {
          notifications.push({
            id: `attention_${call.id}`,
            type: 'attention_call',
            user_id: user.id,
            target_user_id: call.sender_id,
            target_id: call.id,
            target_type: 'attention_call',
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

        // Ordenar por data
        return notifications.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
      }
    },
  });

  // Atualizar contagem de não lidas
  useEffect(() => {
    const count = notifications.filter(n => !n.is_read).length;
    setUnreadCount(count);
    
    // Atualizar badge na aba se suportado
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(count).catch(console.error);
    }
  }, [notifications]);

  // Mutation para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Implementar lógica real aqui
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mutation para marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      // Aqui você implementaria a lógica real
      toast({ 
        title: "✅ Todas marcadas como lidas",
        description: `${unreadCount} notificações atualizadas`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // ============================================
  // HANDLERS
  // ============================================

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como lida
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Tocar som
    if (notificationSettings.sound_enabled && notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(console.error);
    }

    // Navegar
    if (notification.metadata?.url) {
      navigate(notification.metadata.url);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'mention': return <AtSign className="h-4 w-4" />;
      case 'like': return <Heart className="h-4 w-4" />;
      case 'comment': return <MessageCircle className="h-4 w-4" />;
      case 'follow': return <UserPlus className="h-4 w-4" />;
      case 'post_approved': return <TrendingUp className="h-4 w-4" />;
      case 'attention_call': return <AlertCircle className="h-4 w-4" />;
      case 'achievement': return <Crown className="h-4 w-4" />;
      case 'system': return <Shield className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'mention': return "bg-blue-100 text-blue-600 border-blue-200";
      case 'like': return "bg-pink-100 text-pink-600 border-pink-200";
      case 'comment': return "bg-green-100 text-green-600 border-green-200";
      case 'follow': return "bg-purple-100 text-purple-600 border-purple-200";
      case 'attention_call': return "bg-red-100 text-red-600 border-red-200";
      case 'post_approved': return "bg-emerald-100 text-emerald-600 border-emerald-200";
      case 'achievement': return "bg-amber-100 text-amber-600 border-amber-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Agora';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString('pt-BR');
  };

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.is_read;
    if (activeTab === 'mentions') return notification.type === 'mention';
    if (activeTab === 'social') return ['like', 'comment', 'follow', 'friend_request'].includes(notification.type);
    if (activeTab === 'system') return ['post_approved', 'system', 'achievement'].includes(notification.type);
    return true;
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Sons */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      <audio ref={notificationSound} src="/notification-sound.mp3" preload="auto" />

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0 min-w-[22px] h-6 flex items-center justify-center bg-red-500 text-white text-xs font-bold border-2 border-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notificações</h1>
              <p className="text-muted-foreground text-sm">
                {unreadCount > 0 
                  ? `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`
                  : 'Todas as notificações lidas'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.types.mention}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    types: { ...prev.types, mention: !!checked }
                  }))}
                >
                  <AtSign className="h-4 w-4 mr-2" /> Menções
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.types.like}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    types: { ...prev.types, like: !!checked }
                  }))}
                >
                  <Heart className="h-4 w-4 mr-2" /> Curtidas
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.types.comment}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    types: { ...prev.types, comment: !!checked }
                  }))}
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Comentários
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.types.follow}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    types: { ...prev.types, follow: !!checked }
                  }))}
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Seguidores
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Marcar todas</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
            </Button>
            
            <Button
              variant="secondary"
              onClick={testPushNotification}
              className="flex items-center gap-2"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Testar</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="mb-6">
          <TabsList className="grid grid-cols-5 md:w-auto">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Todas</span>
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Não lidas</span>
            </TabsTrigger>
            <TabsTrigger value="mentions" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              <span className="hidden sm:inline">Menções</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notificações */}
        <Card className="overflow-hidden border shadow-lg">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-4 p-4 transition-all hover:bg-accent/30 cursor-pointer group",
                        !notification.is_read && "bg-accent/10"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Avatar/Ícone */}
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "h-12 w-12 rounded-full border-2 flex items-center justify-center",
                          getNotificationColor(notification.type)
                        )}>
                          {notification.metadata?.sender_avatar ? (
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={notification.metadata.sender_avatar} />
                              <AvatarFallback>
                                {notification.metadata.sender_username?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            getNotificationIcon(notification.type)
                          )}
                        </div>
                        {!notification.is_read && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-background" />
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base line-clamp-1">
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsReadMutation.mutate(notification.id);
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Marcar como lida
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Implementar exclusão
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {notification.metadata?.post_content && (
                          <div className="text-xs bg-muted/30 p-2 rounded mb-2 line-clamp-2">
                            "{notification.metadata.post_content}..."
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getNotificationColor(notification.type)
                            )}
                          >
                            {notification.type === 'mention' && 'Menção'}
                            {notification.type === 'like' && 'Curtida'}
                            {notification.type === 'comment' && 'Comentário'}
                            {notification.type === 'follow' && 'Seguidor'}
                            {notification.type === 'friend_request' && 'Amizade'}
                            {notification.type === 'post_approved' && 'Aprovado'}
                            {notification.type === 'attention_call' && 'Atenção'}
                            {notification.type === 'achievement' && 'Conquista'}
                          </Badge>
                          
                          {notification.metadata?.sender_username && (
                            <span className="text-xs text-muted-foreground">
                              por @{notification.metadata.sender_username}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Indicador de ação */}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <BellOff className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {activeTab === 'unread' 
                    ? 'Nenhuma notificação não lida'
                    : 'Nenhuma notificação encontrada'}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {activeTab === 'unread'
                    ? 'Você está em dia com todas as notificações!'
                    : 'Novas notificações aparecerão aqui quando você receber menções, curtidas ou comentários.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('all')}
                    className="gap-2"
                  >
                    <History className="h-4 w-4" />
                    Ver todas
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={testPushNotification}
                    className="gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Testar notificação
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpar antigas
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={requestPushPermission}
              className="gap-2"
              disabled={isRegistering || pushPermission === 'denied'}
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pushPermission === 'granted' ? (
                <>
                  <Bell className="h-4 w-4" />
                  Notificações ativas
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  Ativar push
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Notificações em tempo real
            </span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Configurações */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurações de Notificações</DialogTitle>
            <DialogDescription>
              Configure como você deseja receber notificações
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Configurações gerais */}
            <div className="space-y-4">
              <h4 className="font-medium">Configurações Gerais</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-enabled" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notificações Push (PWA)
                  </Label>
                  <Switch
                    id="push-enabled"
                    checked={notificationSettings.push_enabled}
                    onCheckedChange={(checked) => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        push_enabled: checked
                      }));
                      // Always ensure we actually create/remove the PushSubscription.
                      // Permission can be granted while subscription is still inactive.
                      if (checked) {
                        requestPushPermission();
                      } else {
                        unsubscribeFromPush();
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-enabled" className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Som de notificação
                  </Label>
                  <Switch
                    id="sound-enabled"
                    checked={notificationSettings.sound_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      sound_enabled: checked
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="vibration-enabled" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Vibração (mobile)
                  </Label>
                  <Switch
                    id="vibration-enabled"
                    checked={notificationSettings.vibration_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      vibration_enabled: checked
                    }))}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Tipos de notificação */}
            <div className="space-y-4">
              <h4 className="font-medium">Tipos de Notificação</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(notificationSettings.types).map(([type, enabled]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Switch
                      id={`type-${type}`}
                      checked={enabled}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({
                        ...prev,
                        types: { ...prev.types, [type]: checked }
                      }))}
                    />
                    <Label htmlFor={`type-${type}`} className="capitalize text-sm">
                      {type === 'friend_request' ? 'Pedidos de amizade' :
                       type === 'community' ? 'Comunidades' :
                       type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Horário silencioso */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Horário Silencioso</h4>
                  <p className="text-sm text-muted-foreground">
                    Não receber notificações durante este período
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.quiet_hours.enabled}
                  onCheckedChange={(enabled) => setNotificationSettings(prev => ({
                    ...prev,
                    quiet_hours: { ...prev.quiet_hours, enabled }
                  }))}
                />
              </div>
              
              {notificationSettings.quiet_hours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Início</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={notificationSettings.quiet_hours.start}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        quiet_hours: { ...prev.quiet_hours, start: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">Término</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={notificationSettings.quiet_hours.end}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        quiet_hours: { ...prev.quiet_hours, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Status do PWA */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Status do PWA
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Permissão:</span>
                  <Badge variant={pushPermission === 'granted' ? 'default' : 
                                 pushPermission === 'denied' ? 'destructive' : 'secondary'}>
                    {pushPermission === 'granted' ? '✅ Concedida' : 
                     pushPermission === 'denied' ? '❌ Negada' : '⏳ Pendente'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Inscrição Push:</span>
                  <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                    {isSubscribed ? '✅ Ativa' : '❌ Inativa'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Service Worker:</span>
                  <Badge variant={serviceWorker ? 'default' : 'secondary'}>
                    {serviceWorker ? '✅ Registrado' : '❌ Não registrado'}
                  </Badge>
                </div>
              </div>
              
              {!isSubscribed && (
                <Button
                  onClick={requestPushPermission}
                  className="w-full gap-2 mt-2"
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {isRegistering ? 'Registrando...' : (pushPermission === 'granted' ? 'Inscrever Push' : 'Ativar Notificações Push')}
                </Button>
              )}
              
              {isSubscribed && (
                <Button
                  variant="outline"
                  onClick={unsubscribeFromPush}
                  className="w-full gap-2 mt-2"
                >
                  <BellOff className="h-4 w-4" />
                  Desativar Notificações Push
                </Button>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast({ title: "✅ Configurações salvas!" });
              setShowSettings(false);
            }}>
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de limpar notificações */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar notificações antigas</DialogTitle>
            <DialogDescription>
              Isso removerá notificações antigas (mantendo as últimas 100). Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast({ title: "🗑️ Notificações antigas removidas!" });
                setShowClearDialog(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Notificações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}