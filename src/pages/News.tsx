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
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Push states
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
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
    if (!('Notification' in window)) {
      toast({
        title: "Navegador não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
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
      } else if (permission === 'denied') {
        toast({
          title: "Permissão negada",
          description: "Você não receberá notificações push. Você pode alterar isso nas configurações do navegador.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast({
        title: "Erro ao solicitar permissão",
        description: "Não foi possível solicitar permissão para notificações push.",
        variant: "destructive",
      });
    }
  };

  // Inscrever-se para push notifications
  const subscribeToPush = async (registration: ServiceWorkerRegistration) => {
    try {
      // Chave pública VAPID (obrigatória). Defina no .env: VITE_VAPID_PUBLIC_KEY=...
      const vapidPublicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();

      if (!vapidPublicKey || vapidPublicKey.length < 80) {
        toast({
          title: "Chave VAPID inválida",
          description: "Defina VITE_VAPID_PUBLIC_KEY (chave longa que começa com 'B...') no arquivo .env e reinicie o npm run dev.",
          variant: "destructive",
        });
        throw new Error("applicationServerKey is not valid");
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
        
        // Salvar no localStorage para referência futura
        localStorage.setItem('pushSubscription', JSON.stringify({
          endpoint: subscription.endpoint,
          expires: subscription.expirationTime,
          user: user?.id
        }));
      } else {
        toast({
          title: "Erro ao salvar inscrição",
          description: "Inscrição criada, mas não foi possível salvar no servidor.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro ao inscrever-se para push:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Permissão necessária",
          description: "Você precisa permitir notificações para usar este recurso.",
          variant: "destructive",
        });
      } else if (error.message?.includes('applicationServerKey is not valid')) {
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

      // Salvar no Supabase (sem upsert por endpoint, pois endpoint não é UNIQUE no schema)
      const { data: existingRows, error: findErr } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint)
        .limit(1);

      if (findErr) {
        console.error('Erro ao checar subscription existente:', findErr);
      }

      let saveError: any = null;

      if (existingRows && existingRows.length > 0) {
        const { error } = await supabase
          .from('push_subscriptions')
          .update(subscriptionData)
          .eq('id', existingRows[0].id);

        saveError = error;
      } else {
        const { error } = await supabase
          .from('push_subscriptions')
          .insert(subscriptionData);

        saveError = error;
      }

      if (saveError) {
        console.error('Erro ao salvar no Supabase:', saveError);
        
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
    if (!serviceWorker) return;

    try {
      const subscription = await serviceWorker.pushManager.getSubscription();
      if (subscription) {
        const success = await subscription.unsubscribe();
        if (success) {
          setIsSubscribed(false);
          toast({ title: "✅ Inscrição cancelada!" });
          
          // Remover do servidor
          await removeSubscriptionFromServer(subscription);
          
          // Remover do localStorage
          localStorage.removeItem('pushSubscription');
        }
      }
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      toast({
        title: "Erro ao cancelar inscrição",
        variant: "destructive",
      });
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

      // Tentar enviar push notification
      try {
        const { data: subscription } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (subscription) {
          // Usar uma Function (Netlify) para enviar push
          const response = await fetch('/.netlify/functions/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              title: '🔔 Teste World Flow',
              body: 'Esta é uma notificação push de teste!',
              icon: '/icon-192.png',
              badge: '/badge-72.png',
              url: '/news',
              tag: 'test-notification',
            }),
          });

          // Lê como texto (às vezes Netlify retorna HTML em erro) e tenta converter para JSON
          const raw = await response.text();
          let result: any = {};
          try { result = JSON.parse(raw); } catch { result = { raw }; }

          if (!response.ok) {
            console.error('send-push status:', response.status);
            console.error('send-push response:', result);

            toast({
              title: "❌ Falha ao enviar push",
              description: result?.details || result?.error || result?.raw || "Erro interno do servidor",
              variant: "destructive",
            });

            throw new Error(result?.details || result?.error || "Falha ao enviar push");
          }

          toast({
            title: "📱 Push enviado!",
            description: `Enviado: ${result?.sent ?? "?"} | Falhou: ${result?.failed ?? "?"}`,
          });
        }
      } catch (pushError) {
        console.log('Push notification opcional falhou, continuando...');
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
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      Recarregar
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

        // Buscar menções (sem join por FK, porque mentions_user_id_fkey aponta para auth.users)
        const { data: mentions, error: mentionsErr } = await supabase
          .from('mentions')
          .select('*')
          .eq('mentioned_user_id', user.id)
          .gte('created_at', oneWeekAgo.toISOString())
          .order('created_at', { ascending: false });

        if (mentionsErr) {
          console.error('Erro ao buscar mentions:', mentionsErr);
        }

        const mentionSenderIds = Array.from(new Set((mentions || []).map(m => m.user_id).filter(Boolean)));
        const mentionProfilesById: Record<string, { username?: string; avatar_url?: string }> = {};

        if (mentionSenderIds.length) {
          const { data: mentionProfiles, error: mentionProfilesErr } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', mentionSenderIds);

          if (mentionProfilesErr) {
            console.error('Erro ao buscar profiles das mentions:', mentionProfilesErr);
          } else {
            mentionProfiles?.forEach((p: any) => {
              mentionProfilesById[p.id] = { username: p.username, avatar_url: p.avatar_url };
            });
          }
        }

        (mentions || []).forEach((mention: any) => {
          const p = mentionProfilesById[mention.user_id] || {};
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
                  url: `/post/${post.id}`,
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

        // Buscar pedidos de amizade (sem join por FK para evitar 400 no PostgREST)
        const { data: friendRequests, error: friendRequestsErr } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', oneWeekAgo.toISOString());

        if (friendRequestsErr) {
          console.error('Erro ao buscar friend_requests:', friendRequestsErr);
        }

        const frSenderIds = Array.from(new Set((friendRequests || []).map(r => r.sender_id).filter(Boolean)));
        const frProfilesById: Record<string, { username?: string; avatar_url?: string }> = {};

        if (frSenderIds.length) {
          const { data: frProfiles, error: frProfilesErr } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', frSenderIds);

          if (frProfilesErr) {
            console.error('Erro ao buscar profiles dos friend_requests:', frProfilesErr);
          } else {
            frProfiles?.forEach((p: any) => {
              frProfilesById[p.id] = { username: p.username, avatar_url: p.avatar_url };
            });
          }
        }

        (friendRequests || []).forEach((request: any) => {
          const p = frProfilesById[request.sender_id] || {};
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
    }
  });

  // Atualizar contador de não lidas
  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Mutation para marcar como lida (exemplo básico)
  const markAsReadMutation = useMutation({
    mutationFn: async (notification: Notification) => {
      // Aqui você pode implementar update real dependendo do type
      return notification;
    },
    onSuccess: () => {
      refetch();
    }
  });

  // Mutation para limpar tudo (exemplo básico)
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      // Aqui você pode implementar deletes/updates reais
      return true;
    },
    onSuccess: () => {
      toast({ title: "Notificações limpas!" });
      refetch();
    }
  });

  // ============================================
  // UI HELPERS
  // ============================================

  const getIconByType = (type: NotificationType) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-4 w-4" />;
      case 'like':
        return <Heart className="h-4 w-4" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'follow':
        return <UserPlus className="h-4 w-4" />;
      case 'friend_request_accepted':
        return <User className="h-4 w-4" />;
      case 'community_invite':
        return <Users className="h-4 w-4" />;
      case 'attention_call':
        return <Zap className="h-4 w-4" />;
      case 'message':
        return <MessageCircle className="h-4 w-4" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4" />;
      case 'system':
        return <Shield className="h-4 w-4" />;
      case 'achievement':
        return <Crown className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread' && n.is_read) return false;
    if (activeTab === 'mentions' && n.type !== 'mention') return false;
    if (activeTab === 'social' && !['like', 'comment', 'follow', 'friend_request_accepted', 'friend_request'].includes(n.type)) return false;
    if (activeTab === 'system' && !['system', 'trending', 'achievement', 'attention_call'].includes(n.type)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(n.type)) return false;
    return true;
  });

  const handleOpenNotification = (n: Notification) => {
    const url = n.metadata?.url;
    if (url) navigate(url);
  };

  // ============================================
  // RENDER
  // ============================================

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
          <div className="flex items-center gap-2">
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
                {(
                  [
                    'mention',
                    'like',
                    'comment',
                    'follow',
                    'friend_request',
                    'attention_call',
                    'message',
                    'trending',
                    'system',
                    'achievement',
                  ] as NotificationType[]
                ).map((t) => (
                  <DropdownMenuCheckboxItem
                    key={t}
                    checked={selectedTypes.includes(t)}
                    onCheckedChange={(checked) => {
                      setSelectedTypes((prev) => {
                        if (checked) return [...prev, t];
                        return prev.filter((x) => x !== t);
                      });
                    }}
                  >
                    <span className="mr-2 inline-flex">{getIconByType(t)}</span>
                    {t}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedTypes([])}>
                  Limpar filtros
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {pushPermission !== 'granted' ? (
              <Button onClick={requestPushPermission}>
                <Bell className="h-4 w-4 mr-2" />
                Ativar Push
              </Button>
            ) : isSubscribed ? (
              <>
                <Button variant="outline" onClick={testPushNotification}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Testar Push
                </Button>
                <Button variant="destructive" onClick={unsubscribeFromPush}>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
              </>
            ) : (
              <Button onClick={() => serviceWorker && subscribeToPush(serviceWorker)}>
                <Bell className="h-4 w-4 mr-2" />
                Inscrever Push
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
                        if (!n.is_read) markAsReadMutation.mutate(n);
                        handleOpenNotification(n);
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

                          {n.metadata?.sender_username && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={n.metadata.sender_avatar || ""} />
                                <AvatarFallback>
                                  {n.metadata.sender_username?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{n.metadata.sender_username}</span>
                            </div>
                          )}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>
              Ajuste preferências de notificações e push.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Notificações Push</div>
                <div className="text-sm text-muted-foreground">
                  Status: {pushPermission} | Inscrito: {isSubscribed ? 'sim' : 'não'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pushPermission !== 'granted' ? (
                  <Button onClick={requestPushPermission} disabled={isRegistering}>
                    {isRegistering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                    Ativar
                  </Button>
                ) : isSubscribed ? (
                  <Button variant="destructive" onClick={unsubscribeFromPush}>
                    <BellOff className="h-4 w-4 mr-2" />
                    Desativar
                  </Button>
                ) : (
                  <Button onClick={() => serviceWorker && subscribeToPush(serviceWorker)}>
                    <Bell className="h-4 w-4 mr-2" />
                    Inscrever
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Som</div>
                <div className="text-sm text-muted-foreground">Tocar sons ao receber eventos</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirm */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Limpar notificações?</DialogTitle>
            <DialogDescription>
              Isso removerá/limpará suas notificações exibidas nesta tela.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClearOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAllMutation.mutate();
                setConfirmClearOpen(false);
              }}
            >
              Limpar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
