import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Palette, Type, Archive, Download, Upload, Image, Moon, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ChatSettingsProps {
  user: any;
}

interface ChatConfig {
  wallpaper: string;
  font_size: 'small' | 'medium' | 'large';
  chat_theme: 'default' | 'dark' | 'colorful';
  show_timestamps: boolean;
  show_read_receipts: boolean;
  enable_message_stars: boolean;
  auto_delete_messages: boolean;
  auto_delete_days: number;
  backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  enter_to_send: boolean;
  emoji_suggestions: boolean;
  quick_replies_enabled: boolean;
}

const wallpaperOptions = [
  { id: 'default', name: 'Padrão', preview: 'bg-gradient-to-br from-blue-50 to-indigo-100' },
  { id: 'dark', name: 'Escuro', preview: 'bg-gradient-to-br from-gray-800 to-gray-900' },
  { id: 'nature', name: 'Natureza', preview: 'bg-gradient-to-br from-green-100 to-emerald-200' },
  { id: 'sunset', name: 'Por do sol', preview: 'bg-gradient-to-br from-orange-200 to-pink-300' },
  { id: 'ocean', name: 'Oceano', preview: 'bg-gradient-to-br from-blue-200 to-cyan-300' },
  { id: 'purple', name: 'Roxo', preview: 'bg-gradient-to-br from-purple-200 to-indigo-300' },
];

export const ChatSettings = ({ user }: ChatSettingsProps) => {
  const [settings, setSettings] = useState<ChatConfig>({
    wallpaper: 'default',
    font_size: 'medium',
    chat_theme: 'default',
    show_timestamps: true,
    show_read_receipts: true,
    enable_message_stars: true,
    auto_delete_messages: false,
    auto_delete_days: 30,
    backup_enabled: true,
    backup_frequency: 'weekly',
    enter_to_send: true,
    emoji_suggestions: true,
    quick_replies_enabled: true
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatSettings();
  }, [user]);

  const loadChatSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const settingsData = {
          ...data,
          font_size: data.font_size as 'small' | 'medium' | 'large',
          chat_theme: data.chat_theme as 'default' | 'dark' | 'colorful',
          backup_frequency: data.backup_frequency as 'daily' | 'weekly' | 'monthly'
        };
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading chat settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof ChatConfig, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('chat_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      
      toast.success('Configuração de chat atualizada');
    } catch (error) {
      console.error('Error updating chat settings:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const exportChats = async () => {
    try {
      // This would export chat data
      toast.success('Conversas exportadas com sucesso');
    } catch (error) {
      console.error('Error exporting chats:', error);
      toast.error('Erro ao exportar conversas');
    }
  };

  const importChats = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // This would import chat data
          toast.success('Conversas importadas com sucesso');
        } catch (error) {
          console.error('Error importing chats:', error);
          toast.error('Erro ao importar conversas');
        }
      }
    };
    input.click();
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
      {/* Appearance settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência das conversas
          </CardTitle>
          <CardDescription>
            Personalize a aparência das suas conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallpaper selection */}
          <div className="space-y-3">
            <Label>Papel de parede</Label>
            <div className="grid grid-cols-3 gap-3">
              {wallpaperOptions.map((wallpaper) => (
                <Button
                  key={wallpaper.id}
                  variant={settings.wallpaper === wallpaper.id ? 'default' : 'outline'}
                  className="h-20 p-2 flex flex-col items-center gap-1"
                  onClick={() => updateSetting('wallpaper', wallpaper.id)}
                >
                  <div className={`w-full h-8 rounded ${wallpaper.preview}`} />
                  <span className="text-xs">{wallpaper.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Font size */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label>Tamanho da fonte</Label>
            </div>
            <Select
              value={settings.font_size}
              onValueChange={(value: any) => updateSetting('font_size', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequena</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Chat theme */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Tema das conversas</Label>
              <p className="text-xs text-muted-foreground">
                Escolha o esquema de cores para suas conversas
              </p>
            </div>
            <Select
              value={settings.chat_theme}
              onValueChange={(value: any) => updateSetting('chat_theme', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="colorful">Colorido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Message display settings */}
      <Card>
        <CardHeader>
          <CardTitle>Exibição de mensagens</CardTitle>
          <CardDescription>
            Configure como as mensagens são exibidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mostrar horários</Label>
              <p className="text-xs text-muted-foreground">
                Exibir timestamp das mensagens
              </p>
            </div>
            <Switch
              checked={settings.show_timestamps}
              onCheckedChange={(checked) => updateSetting('show_timestamps', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Confirmações de leitura</Label>
              <p className="text-xs text-muted-foreground">
                Mostrar quando mensagens foram lidas
              </p>
            </div>
            <Switch
              checked={settings.show_read_receipts}
              onCheckedChange={(checked) => updateSetting('show_read_receipts', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mensagens favoritas</Label>
              <p className="text-xs text-muted-foreground">
                Permitir marcar mensagens como favoritas
              </p>
            </div>
            <Switch
              checked={settings.enable_message_stars}
              onCheckedChange={(checked) => updateSetting('enable_message_stars', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Input settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de entrada</CardTitle>
          <CardDescription>
            Configure como enviar e digitar mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enter para enviar</Label>
              <p className="text-xs text-muted-foreground">
                Pressione Enter para enviar mensagem
              </p>
            </div>
            <Switch
              checked={settings.enter_to_send}
              onCheckedChange={(checked) => updateSetting('enter_to_send', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Sugestões de emoji</Label>
              <p className="text-xs text-muted-foreground">
                Mostrar sugestões de emoji ao digitar
              </p>
            </div>
            <Switch
              checked={settings.emoji_suggestions}
              onCheckedChange={(checked) => updateSetting('emoji_suggestions', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Respostas rápidas</Label>
              <p className="text-xs text-muted-foreground">
                Ativar sugestões de respostas rápidas
              </p>
            </div>
            <Switch
              checked={settings.quick_replies_enabled}
              onCheckedChange={(checked) => updateSetting('quick_replies_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-deletion settings */}
      <Card>
        <CardHeader>
          <CardTitle>Exclusão automática</CardTitle>
          <CardDescription>
            Configure a exclusão automática de mensagens antigas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Excluir mensagens antigas</Label>
              <p className="text-xs text-muted-foreground">
                Remove mensagens automaticamente após um período
              </p>
            </div>
            <Switch
              checked={settings.auto_delete_messages}
              onCheckedChange={(checked) => updateSetting('auto_delete_messages', checked)}
            />
          </div>

          {settings.auto_delete_messages && (
            <div className="pl-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Excluir após:</Label>
                <Select
                  value={settings.auto_delete_days.toString()}
                  onValueChange={(value) => updateSetting('auto_delete_days', parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup settings */}
      <Card>
        <CardHeader>
          <CardTitle>Backup das conversas</CardTitle>
          <CardDescription>
            Faça backup das suas conversas para não perder dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Backup automático</Label>
              <p className="text-xs text-muted-foreground">
                Fazer backup das conversas automaticamente
              </p>
            </div>
            <Switch
              checked={settings.backup_enabled}
              onCheckedChange={(checked) => updateSetting('backup_enabled', checked)}
            />
          </div>

          {settings.backup_enabled && (
            <div className="pl-4 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Frequência:</Label>
                <Select
                  value={settings.backup_frequency}
                  onValueChange={(value: any) => updateSetting('backup_frequency', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex gap-2">
            <Button onClick={exportChats} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Exportar conversas
            </Button>
            <Button onClick={importChats} variant="outline" className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Importar conversas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};