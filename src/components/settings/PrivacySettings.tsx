import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Eye, Camera, MessageCircle, Clock, CheckCheck, UserX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PrivacySettingsProps {
  user: any;
}

type PrivacyOption = 'everyone' | 'contacts' | 'nobody';

interface PrivacySettings {
  last_seen: PrivacyOption;
  profile_photo: PrivacyOption;
  about: PrivacyOption;
  status: PrivacyOption;
  read_receipts: boolean;
  typing_indicators: boolean;
  online_status: boolean;
  live_location: PrivacyOption;
  groups: PrivacyOption;
  calls: PrivacyOption;
}

export const PrivacySettings = ({ user }: PrivacySettingsProps) => {
  const [settings, setSettings] = useState<PrivacySettings>({
    last_seen: 'contacts',
    profile_photo: 'contacts',
    about: 'contacts',
    status: 'contacts',
    read_receipts: true,
    typing_indicators: true,
    online_status: true,
    live_location: 'contacts',
    groups: 'contacts',
    calls: 'contacts'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrivacySettings();
  }, [user]);

  const loadPrivacySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const settingsData = {
          ...data,
          last_seen: data.last_seen as PrivacyOption,
          profile_photo: data.profile_photo as PrivacyOption,
          about: data.about as PrivacyOption,
          status: data.status as PrivacyOption,
          live_location: data.live_location as PrivacyOption,
          groups: data.groups as PrivacyOption,
          calls: data.calls as PrivacyOption
        };
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      
      toast.success('Configuração de privacidade atualizada');
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const privacyOptions = [
    { value: 'everyone', label: 'Todos' },
    { value: 'contacts', label: 'Meus contatos' },
    { value: 'nobody', label: 'Ninguém' }
  ];

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Who can see my personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Quem pode ver minhas informações pessoais
          </CardTitle>
          <CardDescription>
            Controle quem pode ver suas informações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Visto por último</Label>
              </div>
              <Select
                value={settings.last_seen}
                onValueChange={(value: PrivacyOption) => updateSetting('last_seen', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <Label>Foto do perfil</Label>
              </div>
              <Select
                value={settings.profile_photo}
                onValueChange={(value: PrivacyOption) => updateSetting('profile_photo', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <Label>Sobre</Label>
              </div>
              <Select
                value={settings.about}
                onValueChange={(value: PrivacyOption) => updateSetting('about', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label>Status online</Label>
              </div>
              <Switch
                checked={settings.online_status}
                onCheckedChange={(checked) => updateSetting('online_status', checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Permite que outros vejam quando você está online
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Message privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacidade de mensagens</CardTitle>
          <CardDescription>
            Configurações relacionadas ao envio e recebimento de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-muted-foreground" />
                <Label>Confirmação de leitura</Label>
              </div>
              <Switch
                checked={settings.read_receipts}
                onCheckedChange={(checked) => updateSetting('read_receipts', checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Se desativado, você também não verá confirmações de leitura dos outros
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <Label>Indicadores de digitação</Label>
              </div>
              <Switch
                checked={settings.typing_indicators}
                onCheckedChange={(checked) => updateSetting('typing_indicators', checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Mostra quando você está digitando para outros contatos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Group and calls privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Grupos e chamadas</CardTitle>
          <CardDescription>
            Controle quem pode te adicionar em grupos e fazer chamadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quem pode me adicionar em grupos</Label>
              <Select
                value={settings.groups}
                onValueChange={(value: PrivacyOption) => updateSetting('groups', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quem pode me ligar</Label>
              <Select
                value={settings.calls}
                onValueChange={(value: PrivacyOption) => updateSetting('calls', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Contatos bloqueados
          </CardTitle>
          <CardDescription>
            Gerencie seus contatos bloqueados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            Ver contatos bloqueados
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};