import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Bell, Volume2, Vibrate, Users, Phone, MessageSquare, Moon, Zap } from 'lucide-react';
import { NotificationSoundSettings } from './NotificationSoundSettings';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  user: any;
}

interface NotificationConfig {
  messages_enabled: boolean;
  messages_sound: boolean;
  messages_vibration: boolean;
  messages_preview: boolean;
  groups_enabled: boolean;
  groups_sound: boolean;
  groups_vibration: boolean;
  groups_preview: boolean;
  calls_enabled: boolean;
  calls_sound: boolean;
  calls_vibration: boolean;
  do_not_disturb: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  high_priority_only: boolean;
}

export const NotificationSettings = ({ user }: NotificationSettingsProps) => {
  const [settings, setSettings] = useState<NotificationConfig>({
    messages_enabled: true,
    messages_sound: true,
    messages_vibration: true,
    messages_preview: true,
    groups_enabled: true,
    groups_sound: true,
    groups_vibration: true,
    groups_preview: true,
    calls_enabled: true,
    calls_sound: true,
    calls_vibration: true,
    do_not_disturb: false,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    high_priority_only: false
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, [user]);

  const loadNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data as NotificationConfig);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationConfig, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      
      toast.success('Configuração de notificação atualizada');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const testNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('UndoinG', {
          body: 'Esta é uma notificação de teste!',
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('UndoinG', {
              body: 'Esta é uma notificação de teste!',
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* General notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações gerais
          </CardTitle>
          <CardDescription>
            Configurações básicas de notificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Não perturbe</Label>
              <p className="text-xs text-muted-foreground">
                Desativa todas as notificações
              </p>
            </div>
            <Switch
              checked={settings.do_not_disturb}
              onCheckedChange={(checked) => updateSetting('do_not_disturb', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Horário silencioso</Label>
              <Switch
                checked={settings.quiet_hours_enabled}
                onCheckedChange={(checked) => updateSetting('quiet_hours_enabled', checked)}
              />
            </div>
            
            {settings.quiet_hours_enabled && (
              <div className="pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Início:</Label>
                  <Select
                    value={settings.quiet_hours_start}
                    onValueChange={(value) => updateSetting('quiet_hours_start', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <Label className="text-sm">Fim:</Label>
                  <Select
                    value={settings.quiet_hours_end}
                    onValueChange={(value) => updateSetting('quiet_hours_end', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Apenas alta prioridade</Label>
              <p className="text-xs text-muted-foreground">
                Notificar apenas mensagens importantes
              </p>
            </div>
            <Switch
              checked={settings.high_priority_only}
              onCheckedChange={(checked) => updateSetting('high_priority_only', checked)}
            />
          </div>

          <Separator />

          <Button onClick={testNotification} variant="outline" className="w-full">
            <Bell className="h-4 w-4 mr-2" />
            Testar notificação
          </Button>
        </CardContent>
      </Card>

      {/* Message notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notificações de mensagens
          </CardTitle>
          <CardDescription>
            Configure como receber notificações de mensagens individuais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar notificações</Label>
            <Switch
              checked={settings.messages_enabled}
              onCheckedChange={(checked) => updateSetting('messages_enabled', checked)}
            />
          </div>

          {settings.messages_enabled && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Label>Som</Label>
                </div>
                <Switch
                  checked={settings.messages_sound}
                  onCheckedChange={(checked) => updateSetting('messages_sound', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vibrate className="h-4 w-4 text-muted-foreground" />
                  <Label>Vibração</Label>
                </div>
                <Switch
                  checked={settings.messages_vibration}
                  onCheckedChange={(checked) => updateSetting('messages_vibration', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Prévia da mensagem</Label>
                  <p className="text-xs text-muted-foreground">
                    Mostrar conteúdo da mensagem na notificação
                  </p>
                </div>
                <Switch
                  checked={settings.messages_preview}
                  onCheckedChange={(checked) => updateSetting('messages_preview', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Group notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Notificações de grupos
          </CardTitle>
          <CardDescription>
            Configure notificações para conversas em grupo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar notificações de grupo</Label>
            <Switch
              checked={settings.groups_enabled}
              onCheckedChange={(checked) => updateSetting('groups_enabled', checked)}
            />
          </div>

          {settings.groups_enabled && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Label>Som</Label>
                </div>
                <Switch
                  checked={settings.groups_sound}
                  onCheckedChange={(checked) => updateSetting('groups_sound', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vibrate className="h-4 w-4 text-muted-foreground" />
                  <Label>Vibração</Label>
                </div>
                <Switch
                  checked={settings.groups_vibration}
                  onCheckedChange={(checked) => updateSetting('groups_vibration', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Prévia da mensagem em grupos</Label>
                <Switch
                  checked={settings.groups_preview}
                  onCheckedChange={(checked) => updateSetting('groups_preview', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Call notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Notificações de chamadas
          </CardTitle>
          <CardDescription>
            Configure alertas para chamadas recebidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar notificações de chamada</Label>
            <Switch
              checked={settings.calls_enabled}
              onCheckedChange={(checked) => updateSetting('calls_enabled', checked)}
            />
          </div>

          {settings.calls_enabled && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Label>Som de chamada</Label>
                </div>
                <Switch
                  checked={settings.calls_sound}
                  onCheckedChange={(checked) => updateSetting('calls_sound', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vibrate className="h-4 w-4 text-muted-foreground" />
                  <Label>Vibração para chamadas</Label>
                </div>
                <Switch
                  checked={settings.calls_vibration}
                  onCheckedChange={(checked) => updateSetting('calls_vibration', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sound settings */}
      <NotificationSoundSettings />
    </div>
  );
};