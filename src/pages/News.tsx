import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  subscribeToPush as subscribeToPushClient,
  unsubscribeFromPush as unsubscribeFromPushClient,
  sendTestPush,
  isPushSupported as isPushSupportedClient,
  getServiceWorkerRegistration,
  checkSubscriptionStatus,
  getPushPermissionState,
} from "@/utils/pushClient";
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
  Zap,
  ThumbsUp,
  Users2,
  Megaphone,
  Award,
  Mail,
  CheckCircle,
  XCircle,
  Star,
  Flag,
  HelpCircle,
  Video,
  Image,
  Music,
  FileText,
  Link,
  MapPin,
  Gift,
  TrendingUp as TrendingUpIcon,
  MessageSquare,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Download,
  Upload,
  Battery,
  Wifi,
  Smartphone,
  Tablet,
  Monitor,
  Coffee,
  Moon,
  Sun,
  Search,
  Copy,
  Tag,
  Folder,
  Briefcase
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
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============================================
// TIPOS BASEADOS NO SEU SUPABASE
// ============================================

export type NotificationType = 
  | 'mention'
  | 'like'
  | 'comment'
  | 'follow'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'post_approved'
  | 'community_invite'
  | 'community_mention'
  | 'community_post'
  | 'attention_call'
  | 'message'
  | 'system'
  | 'achievement'
  | 'profile_visit';

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
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  expires_at?: string;
  read_at?: string;
  metadata?: {
    sender_username?: string;
    sender_avatar?: string;
    sender_id?: string;
    sender_full_name?: string;
    sender_bio?: string;
    sender_friend_code?: string;
    post_content?: string;
    post_id?: string;
    comment_content?: string;
    comment_id?: string;
    community_name?: string;
    community_id?: string;
    community_avatar?: string;
    community_description?: string;
    badge?: string;
    url?: string;
    action_url?: string;
    action_label?: string;
    secondary_action_url?: string;
    secondary_action_label?: string;
    image_url?: string;
    video_url?: string;
    audio_url?: string;
    file_url?: string;
    post_type?: string;
    has_audio?: boolean;
    has_media?: boolean;
    media_count?: number;
    days_following?: number;
    follower_since?: string;
    request_status?: string;
    call_message?: string;
    viewed_at?: string;
    is_urgent?: boolean;
    visit_count?: number;
    last_visit?: string;
    [key: string]: any;
  };
}

interface NotificationSettings {
  push_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  desktop_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  digest_enabled: boolean;
  quiet_mode_enabled: boolean;
  types: {
    mention: boolean;
    like: boolean;
    comment: boolean;
    post: boolean;
    follow: boolean;
    friend_request: boolean;
    community_post: boolean;
    attention_call: boolean;
    message: boolean;
    system: boolean;
    achievement: boolean;
    profile_visit: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  priority_filter: {
    urgent: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
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
  const [showNotificationDetails, setShowNotificationDetails] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'date'>('none');
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    push_enabled: true,
    sound_enabled: true,
    vibration_enabled: true,
    desktop_enabled: true,
    email_enabled: false,
    sms_enabled: false,
    in_app_enabled: true,
    digest_enabled: false,
    quiet_mode_enabled: false,
    types: {
      mention: true,
      like: true,
      comment: true,
      post: true,
      follow: true,
      friend_request: true,
      community_post: true,
      attention_call: true,
      message: true,
      system: true,
      achievement: true,
      profile_visit: true,
    },
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    priority_filter: {
      urgent: true,
      high: true,
      medium: true,
      low: true,
    },
  });

  // Preferências de push (persistidas no Supabase para o backend respeitar)
  const persistPushPreferences = async (settings: NotificationSettings) => {
    if (!user?.id) return;

    const payload = {
      user_id: user.id,
      push_enabled: settings.push_enabled,
      messages: settings.types.message,
      attention_calls: settings.types.attention_call,
      comments: settings.types.comment,
      posts: settings.types.post,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn('Erro ao salvar notification_preferences', error);
    }
  };

  // Evita spam de toast quando a tabela ainda não existe no Supabase
  const prefsErrorToastShown = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('push_enabled,messages,attention_calls,comments,posts')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn('Erro ao carregar notification_preferences', error);

        const code = (error as any)?.code;
        if (code === 'PGRST205' && !prefsErrorToastShown.current) {
          prefsErrorToastShown.current = true;
          toast({
            title: 'Configuração do Supabase pendente',
            description: 'A tabela notification_preferences ainda não existe. Rode a migration SQL do projeto e recarregue.',
            variant: 'destructive',
          });
        }
        return;
      }

      if (!data) {
        // cria linha default (best-effort)
        await persistPushPreferences(notificationSettings);
        return;
      }

      setNotificationSettings((prev) => ({
        ...prev,
        push_enabled: data.push_enabled ?? prev.push_enabled,
        types: {
          ...prev.types,
          message: data.messages ?? prev.types.message,
          attention_call: data.attention_calls ?? prev.types.attention_call,
          comment: data.comments ?? prev.types.comment,
          post: data.posts ?? prev.types.post,
        },
      }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    mentions: 0,
    social: 0,
    system: 0,
  });

  // Armazena o último "visto" do usuário nesta tela
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const notificationSound = useRef<HTMLAudioElement>(null);

  // ============================================
  // FUNÇÕES DE PUSH NOTIFICATIONS
  // ============================================

  const requestPushPermission = async () => {
    if (!isPushSupportedClient()) {
      toast({ title: 'Navegador não suportado', description: 'Seu navegador não suporta notificações push.', variant: 'destructive' });
      return;
    }
    try {
      const registration = await getServiceWorkerRegistration();
      setServiceWorker(registration);
      const ok = await subscribeToPushClient();
      const perm = await getPushPermissionState();
      const subscribed = await checkSubscriptionStatus();
      setPushPermission(perm);
      setIsSubscribed(subscribed);

      if (!ok || !subscribed) {
        // Usually happens when OneSignal hasn't finished initializing yet.
        toast({
          title: 'OneSignal ainda não iniciou',
          description: 'Se não ativar, limpe os dados do site/PWA e tente novamente (erro comum de armazenamento/IndexedDB).',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: '✅ Push ativado!', description: 'Você agora receberá push conforme suas configurações.' });
    } catch (error: any) {
      if ((await getPushPermissionState()) === 'denied') {
        toast({ title: 'Permissão negada', description: 'Ative nas configurações do navegador para receber push.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Erro ao ativar push', description: error?.message || 'Não foi possível ativar notificações push.', variant: 'destructive' });
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      await unsubscribeFromPushClient();
      setIsSubscribed(false);
      setPushPermission(await getPushPermissionState());
      toast({ title: '✅ Notificações push desativadas!' });
    } catch {
      toast({ title: 'Erro ao cancelar inscrição', variant: 'destructive' });
    }
  };

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
      const testNotification: Notification = {
        id: `test_${Date.now()}`,
        type: 'system',
        user_id: user.id,
        title: '🔔 Teste de Notificação',
        message: 'Esta é uma notificação de teste do World Flow!',
        is_read: false,
        is_muted: false,
        priority: 'medium',
        created_at: new Date().toISOString(),
        metadata: {
          sender_username: 'Sistema',
          badge: 'test',
          url: '/news',
          action_url: '/news',
          action_label: 'Ver Detalhes',
        },
      };

      queryClient.setQueryData(['notifications', user.id], (old: Notification[] = []) => [
        testNotification,
        ...old,
      ]);

      if (notificationSound.current) {
        notificationSound.current.currentTime = 0;
        notificationSound.current.play().catch((e: any) => {
          const name = e?.name || '';
          if (name === 'NotAllowedError' || name === 'NotSupportedError' || name === 'AbortError') return;
          console.error(e);
        });
      }

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
      if (!isPushSupportedClient()) {
        console.log('❌ Navegador não suporta Push');
        return;
      }

      try {
        const registration = await getServiceWorkerRegistration();
        setServiceWorker(registration);
        setPushPermission(await getPushPermissionState());
        setIsSubscribed(await checkSubscriptionStatus());

        // A detecção de novo deploy/versão agora é global (após login)
        // via <PwaUpdateListener />.

      } catch (error) {
        console.error('Erro na inicialização:', error);
      }
    };

    initPushNotifications();
  }, []);

  // Carregar/atualizar last_viewed
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const { data } = await supabase
        .from('last_viewed')
        .select('viewed_at')
        .eq('user_id', user.id)
        .eq('section', 'news')
        .order('viewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastViewedAt(data?.viewed_at ?? null);
    };

    load();

    const t = window.setTimeout(async () => {
      try {
        const nowIso = new Date().toISOString();

        const { data: existing } = await supabase
          .from('last_viewed')
          .select('id')
          .eq('user_id', user.id)
          .eq('section', 'news')
          .order('viewed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from('last_viewed')
            .update({ viewed_at: nowIso })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('last_viewed')
            .insert({ user_id: user.id, section: 'news', viewed_at: nowIso });
        }
        setLastViewedAt(nowIso);
      } catch (e) {
        console.error('Falha ao atualizar last_viewed(news):', e);
      }
    }, 1200);

    return () => window.clearTimeout(t);
  }, [user?.id]);

  // ============================================
  // QUERIES E MUTATIONS
  // ============================================

  // Query para notificações
  const { data: notifications = [], isLoading, refetch, error } = useQuery({
    queryKey: ['notifications', user?.id, activeTab, lastViewedAt, dateRange],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      try {
        const notifications: Notification[] = [];
        const now = new Date();
        
        // Definir range de datas baseado na seleção
        let dateFilter = new Date();
        switch(dateRange) {
          case 'today':
            dateFilter.setDate(now.getDate() - 1);
            break;
          case 'week':
            dateFilter.setDate(now.getDate() - 7);
            break;
          case 'month':
            dateFilter.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            dateFilter.setFullYear(now.getFullYear() - 1);
            break;
          default:
            dateFilter = new Date(0); // Desde o início
        }

        const lastSeen = lastViewedAt ? new Date(lastViewedAt).getTime() : null;
        const isAutoRead = (createdAt: string) => {
          if (!lastSeen) return false;
          return new Date(createdAt).getTime() <= lastSeen;
        };

        // Helper para carregar perfis
        const loadProfilesMap = async (ids: string[]) => {
          const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
          if (uniqueIds.length === 0) return new Map<string, { username?: string; avatar_url?: string; full_name?: string; bio?: string; friend_code?: string }>();
          const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name, bio, friend_code')
            .in('id', uniqueIds);
          const map = new Map<string, { username?: string; avatar_url?: string; full_name?: string; bio?: string; friend_code?: string }>();
          (data || []).forEach((p: any) => {
            map.set(p.id, { 
              username: p.username, 
              avatar_url: p.avatar_url,
              full_name: p.full_name,
              bio: p.bio,
              friend_code: p.friend_code
            });
          });
          return map;
        };

        // Buscar notificações da tabela notifications
        const { data: dbNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', dateFilter.toISOString())
          .order('created_at', { ascending: false })
          .limit(200);

        if (dbNotifications && dbNotifications.length > 0) {
          dbNotifications.forEach((n: any) => {
            notifications.push({
              id: n.id,
              type: n.type as NotificationType,
              user_id: n.user_id,
              target_user_id: n.target_user_id,
              target_id: n.target_id,
              target_type: n.target_type,
              title: n.title,
              message: n.message,
              data: n.data,
              is_read: n.is_read || isAutoRead(n.created_at),
              is_muted: n.is_muted || false,
              priority: n.data?.priority || 'medium',
              created_at: n.created_at,
              expires_at: n.expires_at,
              read_at: n.read_at,
              metadata: n.metadata || {},
            });
          });
        }

        // Buscar menções
        const { data: mentions } = await supabase
          .from('mentions')
          .select('*')
          .eq('mentioned_user_id', user.id)
          .gte('created_at', dateFilter.toISOString())
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
            message: `${p.full_name || p.username || 'Alguém'} mencionou você em ${mention.content_type}`,
            is_read: (mention.is_read || false) || isAutoRead(mention.created_at),
            is_muted: false,
            priority: 'high',
            created_at: mention.created_at,
            metadata: {
              sender_username: p.username,
              sender_full_name: p.full_name,
              sender_avatar: p.avatar_url,
              sender_bio: p.bio,
              sender_friend_code: p.friend_code,
              content_type: mention.content_type,
              url: `/${mention.content_type === 'post' ? 'post' : 'comment'}/${mention.content_id}`,
              action_url: `/profile/${mention.user_id}`,
              action_label: 'Ver Perfil',
            },
          });
        });

        // Buscar curtidas
        const { data: userPosts } = await supabase
          .from('posts')
          .select('id, content, media_urls, created_at, post_type, audio_url')
          .eq('user_id', user.id);

        const userPostMap = new Map<string, any>();
        (userPosts || []).forEach((p: any) => userPostMap.set(p.id, p));

        const userPostIds = (userPosts || []).map((p: any) => p.id);

        if (userPostIds.length) {
          const { data: likes } = await supabase
            .from('likes')
            .select('id, post_id, user_id, created_at, profiles!likes_user_id_fkey(username, avatar_url, full_name)')
            .in('post_id', userPostIds)
            .gte('created_at', dateFilter.toISOString())
            .neq('user_id', user.id);

          (likes || []).forEach((like: any) => {
            const post = userPostMap.get(like.post_id);
            const hasMedia = post?.media_urls?.length > 0;
            notifications.push({
              id: `like_${like.id}_${like.post_id}`,
              type: 'like',
              user_id: user.id,
              target_user_id: like.user_id,
              target_id: like.post_id,
              target_type: 'post',
              title: '❤️ Nova curtida no seu post',
              message: `${like.profiles?.full_name || like.profiles?.username || 'Alguém'} curtiu seu ${hasMedia ? 'conteúdo' : 'post'}`,
              is_read: isAutoRead(like.created_at),
              is_muted: false,
              priority: 'medium',
              created_at: like.created_at,
              metadata: {
                sender_username: like.profiles?.username,
                sender_full_name: like.profiles?.full_name,
                sender_avatar: like.profiles?.avatar_url,
                post_content: post?.content?.substring?.(0, 100) || '',
                post_type: post?.post_type,
                has_audio: !!post?.audio_url,
                has_media: hasMedia,
                media_count: post?.media_urls?.length || 0,
                url: `/post/${like.post_id}`,
                action_url: `/profile/${like.user_id}`,
                action_label: 'Ver Perfil',
              },
            });
          });
        }

        // Buscar comentários
        if (userPostIds.length) {
          const { data: comments } = await supabase
            .from('comments')
            .select('id, post_id, user_id, content, created_at, profiles!comments_user_id_fkey(username, avatar_url, full_name)')
            .in('post_id', userPostIds)
            .gte('created_at', dateFilter.toISOString())
            .neq('user_id', user.id);

          (comments || []).forEach((comment: any) => {
            const post = userPostMap.get(comment.post_id);
            notifications.push({
              id: `comment_${comment.id}_${comment.post_id}`,
              type: 'comment',
              user_id: user.id,
              target_user_id: comment.user_id,
              target_id: comment.id,
              target_type: 'comment',
              title: '💬 Novo comentário no seu post',
              message: `${comment.profiles?.full_name || comment.profiles?.username || 'Alguém'} comentou: "${comment.content?.substring(0, 50)}..."`,
              is_read: isAutoRead(comment.created_at),
              is_muted: false,
              priority: 'high',
              created_at: comment.created_at,
              metadata: {
                sender_username: comment.profiles?.username,
                sender_full_name: comment.profiles?.full_name,
                sender_avatar: comment.profiles?.avatar_url,
                comment_content: comment.content,
                comment_length: comment.content?.length || 0,
                post_content: post?.content?.substring?.(0, 100) || '',
                post_type: post?.post_type,
                url: `/post/${comment.post_id}#comment-${comment.id}`,
                action_url: `/profile/${comment.user_id}`,
                action_label: 'Responder',
              },
            });
          });
        }

        // Buscar seguidores
        const { data: followers } = await supabase
          .from('followers')
          .select('*, profiles!followers_follower_id_fkey(username, avatar_url, full_name, bio, created_at)')
          .eq('following_id', user.id)
          .gte('created_at', dateFilter.toISOString());

        followers?.forEach(follower => {
          const followerSince = new Date(follower.created_at);
          const daysFollowing = Math.floor((now.getTime() - followerSince.getTime()) / (1000 * 60 * 60 * 24));
          
          notifications.push({
            id: `follow_${follower.id}`,
            type: 'follow',
            user_id: user.id,
            target_user_id: follower.follower_id,
            title: '👤 Novo seguidor',
            message: `${follower.profiles?.full_name || follower.profiles?.username || 'Alguém'} começou a seguir você${daysFollowing === 0 ? ' hoje!' : ` há ${daysFollowing} dia${daysFollowing !== 1 ? 's' : ''}`}`,
            is_read: isAutoRead(follower.created_at),
            is_muted: false,
            priority: 'medium',
            created_at: follower.created_at,
            metadata: {
              sender_username: follower.profiles?.username,
              sender_full_name: follower.profiles?.full_name,
              sender_avatar: follower.profiles?.avatar_url,
              sender_bio: follower.profiles?.bio,
              days_following: daysFollowing,
              follower_since: follower.created_at,
              url: `/profile/${follower.follower_id}`,
              action_url: `/profile/${follower.follower_id}/follow`,
              action_label: 'Seguir de Volta',
            },
          });
        });

        // Buscar pedidos de amizade
        const { data: friendRequests } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', dateFilter.toISOString());

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
            title: '🤝 Pedido de amizade recebido',
            message: `${p.full_name || p.username || 'Alguém'} quer ser seu amigo no World Flow`,
            is_read: isAutoRead(request.created_at),
            is_muted: false,
            priority: 'high',
            created_at: request.created_at,
            metadata: {
              sender_username: p.username,
              sender_full_name: p.full_name,
              sender_avatar: p.avatar_url,
              sender_bio: p.bio,
              sender_friend_code: p.friend_code,
              request_status: request.status,
              url: '/messages?tab=requests',
              action_url: `/friends/requests/${request.id}/accept`,
              action_label: 'Aceitar Pedido',
              secondary_action_url: `/friends/requests/${request.id}/reject`,
              secondary_action_label: 'Recusar',
            },
          });
        });

        // Buscar chamadas de atenção
        const { data: attentionCalls } = await supabase
          .from('attention_calls')
          .select('*, profiles!attention_calls_sender_id_fkey(username, avatar_url, full_name)')
          .eq('receiver_id', user.id)
          .gte('created_at', dateFilter.toISOString());

        attentionCalls?.forEach(call => {
          const isViewed = !!call.viewed_at;
          const urgency = call.message?.toLowerCase().includes('urgente') || 
                         call.message?.toLowerCase().includes('emergência') ? 'urgent' : 'high';
          
          notifications.push({
            id: `attention_${call.id}`,
            type: 'attention_call',
            user_id: user.id,
            target_user_id: call.sender_id,
            target_id: call.id,
            target_type: 'attention_call',
            title: isViewed ? '📩 Chamada de atenção visualizada' : '🚨 Nova chamada de atenção!',
            message: `${call.profiles?.full_name || call.profiles?.username || 'Alguém'} está chamando sua atenção${call.message ? `: "${call.message.substring(0, 80)}..."` : ''}`,
            is_read: isViewed || isAutoRead(call.created_at),
            is_muted: false,
            priority: urgency,
            created_at: call.created_at,
            metadata: {
              sender_username: call.profiles?.username,
              sender_full_name: call.profiles?.full_name,
              sender_avatar: call.profiles?.avatar_url,
              call_message: call.message,
              viewed_at: call.viewed_at,
              is_urgent: urgency === 'urgent',
              url: '/messages',
              action_url: `/attention/${call.id}/view`,
              action_label: 'Marcar como Vista',
              secondary_action_url: `/profile/${call.sender_id}/silence`,
              secondary_action_label: 'Silenciar',
            },
          });
        });

        // Buscar posts de comunidades
        const { data: myCommunities } = await supabase
          .from('community_members')
          .select('community_id, role, joined_at, communities!community_members_community_id_fkey(name, avatar_url, description)')
          .eq('user_id', user.id);

        const communityIds = (myCommunities || []).map((r: any) => r.community_id);
        if (communityIds.length) {
          const { data: communityPosts } = await supabase
            .from('community_posts')
            .select('id, community_id, user_id, content, media_urls, created_at')
            .in('community_id', communityIds)
            .gte('created_at', dateFilter.toISOString())
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

          const posterIds = Array.from(new Set((communityPosts || []).map((p: any) => p.user_id)));
          const posterProfiles = await loadProfilesMap(posterIds);

          communityPosts?.forEach((p: any) => {
            const prof = posterProfiles.get(p.user_id) || {};
            const community = myCommunities?.find((c: any) => c.community_id === p.community_id)?.communities;
            const preview = (p.content || '').trim().slice(0, 120);
            const hasMedia = p.media_urls?.length > 0;

            notifications.push({
              id: `community_post_${p.id}`,
              type: 'community_post',
              user_id: user.id,
              target_user_id: p.user_id,
              target_id: p.id,
              target_type: 'community_post',
              title: `🏘️ Novo post em ${community?.name || 'Comunidade'}`,
              message: `${prof.full_name || prof.username || 'Alguém'} publicou${hasMedia ? ' com mídia' : ''}: ${preview || 'novo conteúdo'}`,
              is_read: isAutoRead(p.created_at),
              is_muted: false,
              priority: 'medium',
              created_at: p.created_at,
              metadata: {
                sender_username: prof.username,
                sender_full_name: prof.full_name,
                sender_avatar: prof.avatar_url,
                community_name: community?.name,
                community_avatar: community?.avatar_url,
                community_description: community?.description,
                post_content: p.content,
                has_media: hasMedia,
                media_count: p.media_urls?.length || 0,
                url: `/communities/${p.community_id}/post/${p.id}`,
                action_url: `/communities/${p.community_id}`,
                action_label: 'Ver Comunidade',
              },
            });
          });
        }

        // Buscar visitas ao perfil
        const { data: profileVisits } = await supabase
          .from('profile_visits')
          .select('*, profiles!profile_visits_visitor_id_fkey(username, avatar_url, full_name)')
          .eq('visited_id', user.id)
          .gte('created_at', dateFilter.toISOString())
          .order('created_at', { ascending: false })
          .limit(20);

        profileVisits?.forEach(visit => {
          const visitor = visit.profiles;
          notifications.push({
            id: `visit_${visit.id}`,
            type: 'profile_visit',
            user_id: user.id,
            target_user_id: visit.visitor_id,
            title: '👀 Seu perfil foi visitado',
            message: `${visitor?.full_name || visitor?.username || 'Alguém'} visitou seu perfil`,
            is_read: isAutoRead(visit.created_at),
            is_muted: false,
            priority: 'low',
            created_at: visit.created_at,
            metadata: {
              sender_username: visitor?.username,
              sender_full_name: visitor?.full_name,
              sender_avatar: visitor?.avatar_url,
              visit_count: 1,
              last_visit: visit.created_at,
              url: `/profile/${visit.visitor_id}`,
              action_url: `/profile/${visit.visitor_id}`,
              action_label: 'Visitar Perfil',
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

  // Atualizar estatísticas
  useEffect(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const mentions = notifications.filter(n => n.type === 'mention' && !n.is_read).length;
    const social = notifications.filter(n => 
      ['like', 'comment', 'follow', 'friend_request', 'community_post', 'profile_visit'].includes(n.type) && !n.is_read
    ).length;
    const system = notifications.filter(n => 
      ['system', 'attention_call'].includes(n.type) && !n.is_read
    ).length;

    setStats({
      total,
      unread,
      mentions,
      social,
      system,
    });
    
    setUnreadCount(unread);
    
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(unread).catch(console.error);
    }
  }, [notifications]);

  // Mutation para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return notificationId;

      try {
        const nowIso = new Date().toISOString();

        // mention_<uuid>
        if (notificationId.startsWith('mention_')) {
          const id = notificationId.replace('mention_', '');
          await supabase
            .from('mentions')
            .update({ is_read: true })
            .eq('id', id)
            .eq('mentioned_user_id', user.id);
          return notificationId;
        }

        // attention_<uuid>
        if (notificationId.startsWith('attention_')) {
          const id = notificationId.replace('attention_', '');
          await supabase
            .from('attention_calls')
            .update({ viewed_at: nowIso })
            .eq('id', id)
            .eq('receiver_id', user.id);
          return notificationId;
        }

        // notifications table
        if (notificationId.startsWith('notification_') || notificationId.includes('-')) {
          await supabase
            .from('notifications')
            .update({ is_read: true, read_at: nowIso })
            .eq('id', notificationId)
            .eq('user_id', user.id);
        }

        // last_viewed: news
        const { data: existing } = await supabase
          .from('last_viewed')
          .select('id')
          .eq('user_id', user.id)
          .eq('section', 'news')
          .order('viewed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from('last_viewed').update({ viewed_at: nowIso }).eq('id', existing.id);
        } else {
          await supabase.from('last_viewed').insert({ user_id: user.id, section: 'news', viewed_at: nowIso });
        }
        setLastViewedAt(nowIso);
      } catch (e) {
        console.error('Falha ao marcar como lida:', e);
      }

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

      const nowIso = new Date().toISOString();

      try {
        // Mentions
        await supabase
          .from('mentions')
          .update({ is_read: true })
          .eq('mentioned_user_id', user.id)
          .eq('is_read', false);

        // Attention calls
        await supabase
          .from('attention_calls')
          .update({ viewed_at: nowIso })
          .eq('receiver_id', user.id)
          .is('viewed_at', null);

        // Notifications table
        await supabase
          .from('notifications')
          .update({ is_read: true, read_at: nowIso })
          .eq('user_id', user.id)
          .eq('is_read', false);

        // last_viewed: news
        const { data: existing } = await supabase
          .from('last_viewed')
          .select('id')
          .eq('user_id', user.id)
          .eq('section', 'news')
          .order('viewed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from('last_viewed').update({ viewed_at: nowIso }).eq('id', existing.id);
        } else {
          await supabase.from('last_viewed').insert({ user_id: user.id, section: 'news', viewed_at: nowIso });
        }
        setLastViewedAt(nowIso);

        toast({
          title: "✅ Todas marcadas como lidas",
          description: `${unreadCount} notificações atualizadas`,
        });
      } catch (e) {
        console.error('Falha ao marcar todas como lidas:', e);
        toast({ title: "Erro", description: "Não foi possível marcar tudo como lido", variant: "destructive" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mutation para excluir notificação
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;
      
      try {
        // Tenta deletar da tabela notifications
        if (notificationId.includes('-')) {
          await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', user.id);
        }
        
        toast({
          title: "🗑️ Notificação removida",
          description: "A notificação foi excluída com sucesso.",
        });
      } catch (error) {
        console.error('Erro ao excluir notificação:', error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir a notificação.",
          variant: "destructive",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mutation para silenciar notificação
  const muteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;
      
      try {
        // Atualiza na tabela notifications
        if (notificationId.includes('-')) {
          await supabase
            .from('notifications')
            .update({ is_muted: true })
            .eq('id', notificationId)
            .eq('user_id', user.id);
        }
        
        toast({
          title: "🔇 Notificação silenciada",
          description: "Você não receberá mais notificações deste tipo.",
        });
      } catch (error) {
        console.error('Erro ao silenciar notificação:', error);
      }
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
      notificationSound.current.play().catch((e: any) => {
        const name = e?.name || '';
        if (name === 'NotAllowedError' || name === 'NotSupportedError' || name === 'AbortError') return;
        console.error(e);
      });
    }

    // Navegar ou mostrar detalhes
    if (notification.metadata?.url) {
      navigate(notification.metadata.url);
    } else {
      setSelectedNotification(notification);
      setShowNotificationDetails(notification.id);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'mention': return <AtSign className="h-4 w-4" />;
      case 'like': return <Heart className="h-4 w-4" />;
      case 'comment': return <MessageCircle className="h-4 w-4" />;
      case 'follow': return <UserPlus className="h-4 w-4" />;
      case 'friend_request': return <Users className="h-4 w-4" />;
      case 'friend_request_accepted': return <UserCheck className="h-4 w-4" />;
      case 'community_post': return <Users2 className="h-4 w-4" />;
      case 'community_invite': return <Mail className="h-4 w-4" />;
      case 'post_approved': return <CheckCircle className="h-4 w-4" />;
      case 'attention_call': return <Megaphone className="h-4 w-4" />;
      case 'achievement': return <Award className="h-4 w-4" />;
      case 'system': return <Shield className="h-4 w-4" />;
      case 'profile_visit': return <Eye className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: NotificationType, priority?: string) => {
    if (priority === 'urgent') return "bg-red-100 text-red-600 border-red-200";
    if (priority === 'high') return "bg-orange-100 text-orange-600 border-orange-200";
    
    switch (type) {
      case 'mention': return "bg-blue-100 text-blue-600 border-blue-200";
      case 'like': return "bg-pink-100 text-pink-600 border-pink-200";
      case 'comment': return "bg-green-100 text-green-600 border-green-200";
      case 'follow': return "bg-purple-100 text-purple-600 border-purple-200";
      case 'friend_request': return "bg-indigo-100 text-indigo-600 border-indigo-200";
      case 'friend_request_accepted': return "bg-emerald-100 text-emerald-600 border-emerald-200";
      case 'community_post': return "bg-cyan-100 text-cyan-600 border-cyan-200";
      case 'community_invite': return "bg-sky-100 text-sky-700 border-sky-200";
      case 'post_approved': return "bg-emerald-100 text-emerald-600 border-emerald-200";
      case 'attention_call': return "bg-red-100 text-red-600 border-red-200";
      case 'achievement': return "bg-amber-100 text-amber-600 border-amber-200";
      case 'system': return "bg-gray-100 text-gray-600 border-gray-200";
      case 'profile_visit': return "bg-violet-100 text-violet-600 border-violet-200";
      case 'message': return "bg-sky-100 text-sky-600 border-sky-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive" className="text-xs">URGENTE</Badge>;
      case 'high': return <Badge className="bg-orange-500 text-white text-xs">ALTA</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">MÉDIA</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">BAIXA</Badge>;
      default: return null;
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
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);

    if (diffSec < 60) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} minuto${diffMin !== 1 ? 's' : ''} atrás`;
    if (diffHour < 24) return `${diffHour} hora${diffHour !== 1 ? 's' : ''} atrás`;
    if (diffDay < 7) return `${diffDay} dia${diffDay !== 1 ? 's' : ''} atrás`;
    if (diffMonth < 12) return `${diffMonth} mês${diffMonth !== 1 ? 'es' : ''} atrás`;
    return `${diffYear} ano${diffYear !== 1 ? 's' : ''} atrás`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    // Filtro de aba
    if (activeTab === 'unread' && notification.is_read) return false;
    if (activeTab === 'mentions' && notification.type !== 'mention') return false;
    if (activeTab === 'social' && !['like', 'comment', 'follow', 'friend_request', 'community_post', 'profile_visit', 'friend_request_accepted'].includes(notification.type)) return false;
    if (activeTab === 'system' && !['system', 'attention_call'].includes(notification.type)) return false;

    // Filtro de prioridade
    if (filterPriority !== 'all' && notification.priority !== filterPriority) return false;

    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = `
        ${notification.title.toLowerCase()}
        ${notification.message.toLowerCase()}
        ${notification.metadata?.sender_username?.toLowerCase() || ''}
        ${notification.metadata?.sender_full_name?.toLowerCase() || ''}
        ${notification.metadata?.post_content?.toLowerCase() || ''}
        ${notification.metadata?.comment_content?.toLowerCase() || ''}
        ${notification.metadata?.community_name?.toLowerCase() || ''}
        ${notification.type.toLowerCase()}
      `;
      if (!searchableText.includes(query)) return false;
    }

    // Filtro de configurações de tipos
    if (notificationSettings.types[notification.type] === false) return false;

    return true;
  });

  // Agrupar notificações
  const groupedNotifications = (() => {
    if (groupBy === 'none') return { 'Todas': filteredNotifications };
    
    if (groupBy === 'type') {
      const groups: Record<string, Notification[]> = {};
      filteredNotifications.forEach(notification => {
        const type = notification.type;
        if (!groups[type]) groups[type] = [];
        groups[type].push(notification);
      });
      return groups;
    }
    
    if (groupBy === 'date') {
      const groups: Record<string, Notification[]> = {};
      filteredNotifications.forEach(notification => {
        const date = new Date(notification.created_at).toLocaleDateString('pt-BR');
        if (!groups[date]) groups[date] = [];
        groups[date].push(notification);
      });
      return groups;
    }
    
    return { 'Todas': filteredNotifications };
  })();

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/5">
      {/* Sons */}
      <audio ref={audioRef} src="/sounds/alertasom.mp3" preload="auto" />
      <audio ref={notificationSound} src="/sounds/alertasom.mp3" preload="auto" />

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg">
                  <Bell className="h-7 w-7 text-primary" />
                </div>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 px-2 py-0 min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white text-xs font-bold border-2 border-background animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Centro de Notificações
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {unreadCount > 0 
                    ? `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''} de ${stats.total} total`
                    : 'Todas as notificações estão em dia! 🎉'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => refetch()}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Atualizar notificações</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtros</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Filtrar Notificações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      Prioridade
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={filterPriority} onValueChange={setFilterPriority}>
                        <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="urgent">Urgente</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="high">Alta</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="medium">Média</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="low">Baixa</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Calendar className="h-4 w-4 mr-2" />
                      Período
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={dateRange} onValueChange={setDateRange}>
                        <DropdownMenuRadioItem value="all">Todo período</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="today">Hoje</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="week">Esta semana</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="month">Este mês</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="year">Este ano</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Users className="h-4 w-4 mr-2" />
                      Agrupar por
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={groupBy} onValueChange={setGroupBy}>
                        <DropdownMenuRadioItem value="none">Não agrupar</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="type">Tipo</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="date">Data</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Marcar todas</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configurações</span>
              </Button>
              
              <Button
                variant="secondary"
                onClick={testPushNotification}
                className="gap-2"
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

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-xs text-blue-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-xs text-red-600 font-medium">Não Lidas</p>
                  <p className="text-2xl font-bold text-red-700">{stats.unread}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-xs text-green-600 font-medium">Menções</p>
                  <p className="text-2xl font-bold text-green-700">{stats.mentions}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-medium">Social</p>
                  <p className="text-2xl font-bold text-purple-700">{stats.social}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-xs text-gray-600 font-medium">Sistema</p>
                  <p className="text-2xl font-bold text-gray-700">{stats.system}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de busca */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar em notificações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="mb-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Todas</span>
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Não lidas</span>
              {stats.unread > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {stats.unread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              <span className="hidden sm:inline">Menções</span>
              {stats.mentions > 0 && (
                <Badge variant="default" className="h-5 px-1.5 text-xs bg-blue-500">
                  {stats.mentions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Social</span>
              {stats.social > 0 && (
                <Badge variant="default" className="h-5 px-1.5 text-xs bg-purple-500">
                  {stats.social}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema</span>
              {stats.system > 0 && (
                <Badge variant="default" className="h-5 px-1.5 text-xs bg-gray-500">
                  {stats.system}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notificações */}
        <Card className="overflow-hidden border shadow-xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4 animate-pulse">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="divide-y">
                  {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
                    <div key={groupName}>
                      {groupBy !== 'none' && (
                        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 px-4 py-2 border-b">
                          <h3 className="text-sm font-semibold text-muted-foreground">
                            {groupName} ({groupNotifications.length})
                          </h3>
                        </div>
                      )}
                      
                      {groupNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "flex items-start gap-4 p-4 transition-all hover:bg-accent/20 cursor-pointer group",
                            !notification.is_read && "bg-accent/10",
                            notification.priority === 'urgent' && "border-l-4 border-l-red-500"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {/* Avatar/Ícone com Status */}
                          <div className="relative flex-shrink-0">
                            <div className={cn(
                              "h-12 w-12 rounded-full border-2 flex items-center justify-center shadow-sm",
                              getNotificationColor(notification.type, notification.priority)
                            )}>
                              {notification.metadata?.sender_avatar ? (
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={notification.metadata.sender_avatar} />
                                  <AvatarFallback className={cn(
                                    notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                    notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                    'bg-muted'
                                  )}>
                                    {notification.metadata.sender_username?.[0]?.toUpperCase() || 
                                     notification.metadata.sender_full_name?.[0]?.toUpperCase() || 
                                     'U'}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-10 w-10 flex items-center justify-center">
                                  {getNotificationIcon(notification.type)}
                                </div>
                              )}
                            </div>
                            {!notification.is_read && (
                              <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-background animate-pulse" />
                            )}
                            {notification.is_muted && (
                              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-gray-400 rounded-full border-2 border-background">
                                <VolumeX className="h-2 w-2 text-white mx-auto my-0.5" />
                              </div>
                            )}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm md:text-base line-clamp-1">
                                  {notification.title}
                                </h3>
                                {getPriorityBadge(notification.priority)}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground">
                                        {formatTimeAgo(notification.created_at)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{formatDate(notification.created_at)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsReadMutation.mutate(notification.id);
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Marcar como lida
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        muteNotificationMutation.mutate(notification.id);
                                      }}
                                    >
                                      <VolumeX className="h-4 w-4 mr-2" />
                                      Silenciar este tipo
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotificationMutation.mutate(notification.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir notificação
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            {/* Informações Adicionais */}
                            <div className="space-y-2">
                              {/* Conteúdo do Post/Comentário */}
                              {(notification.metadata?.post_content || notification.metadata?.comment_content) && (
                                <div className="text-xs bg-muted/20 p-2 rounded line-clamp-2">
                                  <span className="font-medium">Conteúdo: </span>
                                  "{notification.metadata.post_content || notification.metadata.comment_content}..."
                                </div>
                              )}
                              
                              {/* Metadados */}
                              <div className="flex flex-wrap gap-2">
                                {notification.metadata?.sender_username && (
                                  <Badge variant="outline" className="text-xs">
                                    <User className="h-3 w-3 mr-1" />
                                    @{notification.metadata.sender_username}
                                  </Badge>
                                )}
                                
                                {notification.metadata?.community_name && (
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {notification.metadata.community_name}
                                  </Badge>
                                )}
                                
                                {notification.metadata?.has_media && (
                                  <Badge variant="outline" className="text-xs">
                                    <Image className="h-3 w-3 mr-1" />
                                    Mídia ({notification.metadata.media_count})
                                  </Badge>
                                )}
                                
                                {notification.metadata?.has_audio && (
                                  <Badge variant="outline" className="text-xs">
                                    <Music className="h-3 w-3 mr-1" />
                                    Áudio
                                  </Badge>
                                )}
                                
                                {notification.metadata?.days_following !== undefined && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Segue há {notification.metadata.days_following} dias
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Ações Rápidas */}
                              {notification.metadata?.action_url && (
                                <div className="flex gap-2 mt-2">
                                  {notification.metadata.action_label && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (notification.metadata?.action_url) {
                                          navigate(notification.metadata.action_url);
                                        }
                                      }}
                                    >
                                      {notification.metadata.action_label}
                                    </Button>
                                  )}
                                  
                                  {notification.metadata?.secondary_action_label && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (notification.metadata?.secondary_action_url) {
                                          navigate(notification.metadata.secondary_action_url);
                                        }
                                      }}
                                    >
                                      {notification.metadata.secondary_action_label}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Indicador de ação */}
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-32 h-32 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-6">
                  <BellOff className="h-16 w-16 text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {searchQuery 
                    ? 'Nenhuma notificação encontrada'
                    : activeTab === 'unread' 
                    ? 'Todas as notificações estão lidas! 🎉'
                    : 'Nenhuma notificação nesta categoria'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                  {searchQuery
                    ? 'Tente ajustar seus termos de busca para encontrar notificações específicas.'
                    : activeTab === 'unread'
                    ? 'Você está completamente em dia com todas as suas notificações! Continue assim!'
                    : 'As notificações aparecerão aqui quando você receber novas interações.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Limpar busca
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('all');
                      setSearchQuery('');
                      setFilterPriority('all');
                    }}
                    className="gap-2"
                  >
                    <History className="h-4 w-4" />
                    Ver todas as notificações
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
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpar notificações antigas
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
                  Notificações push ativas
                </>
              ) : pushPermission === 'denied' ? (
                <>
                  <BellOff className="h-4 w-4" />
                  Push bloqueado
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  Ativar notificações push
                </>
              )}
            </Button>
            
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Atualizações em tempo real</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>Última atualização: {formatTimeAgo(new Date().toISOString())}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {notifications.length} notificações
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {unreadCount} para revisar
            </span>
          </div>
        </div>
      </div>

      {/* Dialog de Configurações */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Configurações de Notificações</DialogTitle>
            <DialogDescription>
              Personalize como você recebe notificações
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Controle suas notificações</AlertTitle>
              <AlertDescription>
                Configure quais notificações você deseja receber e como deseja recebê-las.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-enabled" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Notificações Push</p>
                    <p className="text-xs text-muted-foreground">Receba notificações mesmo com o app fechado</p>
                  </div>
                </Label>
                <Switch
                  id="push-enabled"
                  checked={notificationSettings.push_enabled}
                  onCheckedChange={(checked) => {
                    const next = {
                      ...notificationSettings,
                      push_enabled: checked,
                    };
                    setNotificationSettings(next);
                    persistPushPreferences(next);
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
                  <div>
                    <p className="font-medium">Som de notificação</p>
                    <p className="text-xs text-muted-foreground">Reproduzir som quando receber notificações</p>
                  </div>
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
                  <Smartphone className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Vibração (mobile)</p>
                    <p className="text-xs text-muted-foreground">Vibrar ao receber notificações no celular</p>
                  </div>
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
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => {
                          const next = {
                            ...prev,
                            types: { ...prev.types, [type]: checked },
                          };

                          if (type === 'message' || type === 'mention' || type === 'attention_call' || type === 'friend_request' || type === 'comment' || type === 'post') {
                            void persistPushPreferences(next);
                          }

                          return next;
                        });
                      }}
                    />
                    <Label htmlFor={`type-${type}`} className="capitalize text-sm">
                      {type === 'friend_request' ? 'Pedidos de amizade' :
	                       type === 'comment' ? 'Comentários' :
                       type === 'community_post' ? 'Posts em comunidade' :
                       type === 'post' ? 'Posts de amigos' :
                       type === 'attention_call' ? 'Chamadas de atenção' :
                       type === 'profile_visit' ? 'Visitas ao perfil' :
                       type === 'system' ? 'Sistema' :
                       type === 'achievement' ? 'Conquistas' :
                       type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Filtros de Prioridade */}
            <div className="space-y-4">
              <h4 className="font-medium">Filtros de Prioridade</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(notificationSettings.priority_filter).map(([priority, enabled]) => (
                  <div key={priority} className="flex items-center space-x-2">
                    <Switch
                      id={`priority-${priority}`}
                      checked={enabled}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({
                        ...prev,
                        priority_filter: { ...prev.priority_filter, [priority]: checked }
                      }))}
                    />
                    <Label htmlFor={`priority-${priority}`} className="capitalize text-sm">
                      {priority === 'urgent' ? 'Urgente' :
                       priority === 'high' ? 'Alta' :
                       priority === 'medium' ? 'Média' :
                       'Baixa'}
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
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção!</AlertTitle>
              <AlertDescription>
                Esta ação removerá permanentemente notificações antigas. Certifique-se de ter revisado todas as notificações importantes.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground">
              <p>Serão mantidas:</p>
              <ul className="list-disc pl-4 mt-2 space-y-1">
                <li>Últimas 100 notificações</li>
                <li>Notificações não lidas</li>
                <li>Notificações importantes (urgentes)</li>
              </ul>
            </div>
          </div>
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
              Limpar Notificações Antigas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes da Notificação */}
      <Dialog open={!!showNotificationDetails} onOpenChange={(open) => !open && setShowNotificationDetails(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedNotification && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    getNotificationColor(selectedNotification.type, selectedNotification.priority)
                  )}>
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                  {selectedNotification.title}
                </DialogTitle>
                <DialogDescription>
                  {formatDate(selectedNotification.created_at)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Mensagem:</h4>
                  <p className="text-sm">{selectedNotification.message}</p>
                </div>
                
                {selectedNotification.metadata && (
                  <>
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Detalhes:</h4>
                      <div className="space-y-2 text-sm">
                        {selectedNotification.metadata.sender_username && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>De: @{selectedNotification.metadata.sender_username}</span>
                          </div>
                        )}
                        
                        {selectedNotification.metadata.sender_full_name && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Nome: {selectedNotification.metadata.sender_full_name}</span>
                          </div>
                        )}
                        
                        {selectedNotification.type && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span>Tipo: {selectedNotification.type}</span>
                          </div>
                        )}
                        
                        {selectedNotification.priority && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span>Prioridade: {selectedNotification.priority}</span>
                          </div>
                        )}
                        
                        {selectedNotification.metadata.url && (
                          <div className="flex items-center gap-2">
                            <Link className="h-4 w-4 text-muted-foreground" />
                            <span>Link: {selectedNotification.metadata.url}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedNotification.metadata.post_content && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Conteúdo relacionado:</h4>
                          <div className="text-sm bg-muted/30 p-3 rounded">
                            {selectedNotification.metadata.post_content}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {selectedNotification.metadata.comment_content && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Comentário:</h4>
                          <div className="text-sm bg-muted/30 p-3 rounded">
                            {selectedNotification.metadata.comment_content}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              
              <DialogFooter>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => setShowNotificationDetails(null)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                  {selectedNotification.metadata?.action_url && (
                    <Button
                      onClick={() => {
                        if (selectedNotification.metadata?.action_url) {
                          navigate(selectedNotification.metadata.action_url);
                          setShowNotificationDetails(null);
                        }
                      }}
                      className="flex-1"
                    >
                      {selectedNotification.metadata.action_label || 'Acessar'}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}