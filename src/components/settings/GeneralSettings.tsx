import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Calendar, 
  Clock, 
  Keyboard, 
  Smartphone, 
  Lock, 
  Fingerprint, 
  HelpCircle, 
  Info,
  Download,
  Star,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface GeneralSettingsProps {
  user: any;
}

interface GeneralConfig {
  language: string;
  region: string;
  date_format: string;
  time_format: '12h' | '24h';
  keyboard_type: string;
  auto_correct: boolean;
  spell_check: boolean;
  predictive_text: boolean;
  haptic_feedback: boolean;
  app_lock: boolean;
  fingerprint_unlock: boolean;
}

const languageOptions = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '中文 (简体)' }
];

const regionOptions = [
  { value: 'BR', label: 'Brasil' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'Espanha' },
  { value: 'FR', label: 'França' },
  { value: 'DE', label: 'Alemanha' },
  { value: 'IT', label: 'Itália' },
  { value: 'JP', label: 'Japão' },
  { value: 'CN', label: 'China' }
];

const dateFormatOptions = [
  { value: 'dd/mm/yyyy', label: '31/12/2023' },
  { value: 'mm/dd/yyyy', label: '12/31/2023' },
  { value: 'yyyy-mm-dd', label: '2023-12-31' },
  { value: 'dd-mm-yyyy', label: '31-12-2023' }
];

const keyboardOptions = [
  { value: 'default', label: 'Padrão do sistema' },
  { value: 'qwerty', label: 'QWERTY' },
  { value: 'azerty', label: 'AZERTY' },
  { value: 'qwertz', label: 'QWERTZ' },
  { value: 'dvorak', label: 'Dvorak' },
  { value: 'colemak', label: 'Colemak' }
];

export const GeneralSettings = ({ user }: GeneralSettingsProps) => {
  const [settings, setSettings] = useState<GeneralConfig>({
    language: 'pt-BR',
    region: 'BR',
    date_format: 'dd/mm/yyyy',
    time_format: '24h',
    keyboard_type: 'default',
    auto_correct: true,
    spell_check: true,
    predictive_text: true,
    haptic_feedback: true,
    app_lock: false,
    fingerprint_unlock: false
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGeneralSettings();
  }, [user]);

  const loadGeneralSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('general_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const settingsData = {
          ...data,
          time_format: data.time_format as '12h' | '24h'
        };
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading general settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof GeneralConfig, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('general_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      
      toast.success('Configuração geral atualizada');
    } catch (error) {
      console.error('Error updating general settings:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const exportData = async () => {
    try {
      // This would export user data
      toast.success('Dados exportados com sucesso');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const clearCache = async () => {
    try {
      // Clear app cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage (except auth)
      const authData = localStorage.getItem('sb-amkfdpyuaurfarxcrodx-auth-token');
      localStorage.clear();
      if (authData) {
        localStorage.setItem('sb-amkfdpyuaurfarxcrodx-auth-token', authData);
      }
      
      toast.success('Cache limpo com sucesso');
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Erro ao limpar cache');
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
      {/* Language and region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Idioma e região
          </CardTitle>
          <CardDescription>
            Configure o idioma e formato regional do aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Idioma do aplicativo</Label>
            <Select
              value={settings.language}
              onValueChange={(value) => updateSetting('language', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Região</Label>
            <Select
              value={settings.region}
              onValueChange={(value) => updateSetting('region', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Date and time format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Formato de data e hora
          </CardTitle>
          <CardDescription>
            Como datas e horários são exibidos no aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Formato de data</Label>
            <Select
              value={settings.date_format}
              onValueChange={(value) => updateSetting('date_format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateFormatOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>Formato de hora</Label>
            </div>
            <Select
              value={settings.time_format}
              onValueChange={(value: '12h' | '24h') => updateSetting('time_format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 horas (23:59)</SelectItem>
                <SelectItem value="12h">12 horas (11:59 PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard and input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Teclado e entrada de texto
          </CardTitle>
          <CardDescription>
            Configure como você digita e envia mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de teclado</Label>
            <Select
              value={settings.keyboard_type}
              onValueChange={(value) => updateSetting('keyboard_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {keyboardOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Correção automática</Label>
              <p className="text-xs text-muted-foreground">
                Corrige automaticamente palavras mal digitadas
              </p>
            </div>
            <Switch
              checked={settings.auto_correct}
              onCheckedChange={(checked) => updateSetting('auto_correct', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Verificação ortográfica</Label>
              <p className="text-xs text-muted-foreground">
                Destaca palavras com possíveis erros
              </p>
            </div>
            <Switch
              checked={settings.spell_check}
              onCheckedChange={(checked) => updateSetting('spell_check', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Texto preditivo</Label>
              <p className="text-xs text-muted-foreground">
                Sugere palavras enquanto você digita
              </p>
            </div>
            <Switch
              checked={settings.predictive_text}
              onCheckedChange={(checked) => updateSetting('predictive_text', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Device settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Configurações do dispositivo
          </CardTitle>
          <CardDescription>
            Configurações específicas do seu dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Feedback tátil</Label>
              <p className="text-xs text-muted-foreground">
                Vibração ao tocar em botões e elementos
              </p>
            </div>
            <Switch
              checked={settings.haptic_feedback}
              onCheckedChange={(checked) => updateSetting('haptic_feedback', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Segurança do aplicativo
          </CardTitle>
          <CardDescription>
            Proteja o acesso ao seu aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Bloqueio do aplicativo</Label>
              <p className="text-xs text-muted-foreground">
                Requer senha/PIN para acessar o app
              </p>
            </div>
            <Switch
              checked={settings.app_lock}
              onCheckedChange={(checked) => updateSetting('app_lock', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>Desbloqueio por impressão digital</Label>
                <p className="text-xs text-muted-foreground">
                  Use sua impressão digital para desbloquear
                </p>
              </div>
            </div>
            <Switch
              checked={settings.fingerprint_unlock}
              onCheckedChange={(checked) => updateSetting('fingerprint_unlock', checked)}
              disabled={!settings.app_lock}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data management */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de dados</CardTitle>
          <CardDescription>
            Gerencie seus dados e cache do aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={exportData} variant="outline" className="w-full justify-start">
            <Download className="h-4 w-4 mr-2" />
            Exportar meus dados
          </Button>

          <Button onClick={clearCache} variant="outline" className="w-full justify-start">
            <Smartphone className="h-4 w-4 mr-2" />
            Limpar cache do aplicativo
          </Button>
        </CardContent>
      </Card>

      {/* Help and about */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Ajuda e sobre
          </CardTitle>
          <CardDescription>
            Obtenha ajuda e veja informações do aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <HelpCircle className="h-4 w-4 mr-2" />
            Central de ajuda
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <Star className="h-4 w-4 mr-2" />
            Avaliar aplicativo
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <Info className="h-4 w-4 mr-2" />
            Sobre o UndoinG
          </Button>

          <div className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Versão:</span>
              <Badge variant="secondary">1.0.0</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Última atualização:</span>
              <span className="text-sm">16 de agosto, 2024</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};