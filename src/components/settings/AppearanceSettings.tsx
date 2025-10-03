import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Type, 
  Zap, 
  Eye, 
  Contrast,
  Layout,
  PanelLeft
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AppearanceSettingsProps {
  user: any;
}

interface AppearanceConfig {
  theme: 'light' | 'dark' | 'system';
  accent_color: string;
  font_family: string;
  animation_speed: 'slow' | 'normal' | 'fast';
  reduce_motion: boolean;
  high_contrast: boolean;
  large_text: boolean;
  show_avatars: boolean;
  compact_mode: boolean;
  sidebar_position: 'left' | 'right';
}

const accentColors = [
  { value: 'blue', label: 'Azul', color: 'bg-blue-500' },
  { value: 'green', label: 'Verde', color: 'bg-green-500' },
  { value: 'purple', label: 'Roxo', color: 'bg-purple-500' },
  { value: 'red', label: 'Vermelho', color: 'bg-red-500' },
  { value: 'orange', label: 'Laranja', color: 'bg-orange-500' },
  { value: 'pink', label: 'Rosa', color: 'bg-pink-500' },
  { value: 'teal', label: 'Azul-verde', color: 'bg-teal-500' },
  { value: 'indigo', label: 'Índigo', color: 'bg-indigo-500' }
];

const fontFamilies = [
  { value: 'system', label: 'Padrão do sistema' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'opensans', label: 'Open Sans' },
  { value: 'lato', label: 'Lato' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'poppins', label: 'Poppins' }
];

export const AppearanceSettings = ({ user }: AppearanceSettingsProps) => {
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState<AppearanceConfig>({
    theme: 'system',
    accent_color: 'blue',
    font_family: 'system',
    animation_speed: 'normal',
    reduce_motion: false,
    high_contrast: false,
    large_text: false,
    show_avatars: true,
    compact_mode: false,
    sidebar_position: 'left'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppearanceSettings();
  }, [user]);

  const loadAppearanceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('appearance_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const settingsData = {
          ...data,
          theme: data.theme as 'light' | 'dark' | 'system',
          animation_speed: data.animation_speed as 'slow' | 'normal' | 'fast',
          sidebar_position: data.sidebar_position as 'left' | 'right'
        };
        setSettings(settingsData);
        // Sync theme with theme provider
        if (settingsData.theme !== theme) {
          setTheme(settingsData.theme);
        }
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof AppearanceConfig, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      // Update theme provider if theme changed
      if (key === 'theme') {
        setTheme(value);
      }

      const { error } = await supabase
        .from('appearance_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      
      toast.success('Configuração de aparência atualizada');
    } catch (error) {
      console.error('Error updating appearance settings:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const resetToDefault = async () => {
    const defaultSettings: AppearanceConfig = {
      theme: 'system',
      accent_color: 'blue',
      font_family: 'system',
      animation_speed: 'normal',
      reduce_motion: false,
      high_contrast: false,
      large_text: false,
      show_avatars: true,
      compact_mode: false,
      sidebar_position: 'left'
    };

    try {
      setSettings(defaultSettings);
      setTheme('system');

      const { error } = await supabase
        .from('appearance_settings')
        .upsert({
          user_id: user.id,
          ...defaultSettings
        });

      if (error) throw error;
      
      toast.success('Configurações resetadas para o padrão');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Erro ao resetar configurações');
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
      {/* Theme selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema
          </CardTitle>
          <CardDescription>
            Escolha como o aplicativo deve aparecer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={settings.theme === 'light' ? 'default' : 'outline'}
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => updateSetting('theme', 'light')}
            >
              <Sun className="h-6 w-6" />
              <span className="text-xs">Claro</span>
            </Button>

            <Button
              variant={settings.theme === 'dark' ? 'default' : 'outline'}
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => updateSetting('theme', 'dark')}
            >
              <Moon className="h-6 w-6" />
              <span className="text-xs">Escuro</span>
            </Button>

            <Button
              variant={settings.theme === 'system' ? 'default' : 'outline'}
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => updateSetting('theme', 'system')}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-xs">Sistema</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accent color */}
      <Card>
        <CardHeader>
          <CardTitle>Cor de destaque</CardTitle>
          <CardDescription>
            Escolha a cor principal do aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {accentColors.map((color) => (
              <Button
                key={color.value}
                variant={settings.accent_color === color.value ? 'default' : 'outline'}
                className="h-16 flex flex-col items-center gap-1 p-2"
                onClick={() => updateSetting('accent_color', color.value)}
              >
                <div className={`w-6 h-6 rounded-full ${color.color}`} />
                <span className="text-xs">{color.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Tipografia
          </CardTitle>
          <CardDescription>
            Configure a fonte e tamanho do texto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Família da fonte</Label>
            <Select
              value={settings.font_family}
              onValueChange={(value) => updateSetting('font_family', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map(font => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Texto grande</Label>
              <p className="text-xs text-muted-foreground">
                Aumenta o tamanho do texto em todo o aplicativo
              </p>
            </div>
            <Switch
              checked={settings.large_text}
              onCheckedChange={(checked) => updateSetting('large_text', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Animation and motion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Animações e movimento
          </CardTitle>
          <CardDescription>
            Configure a velocidade das animações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Velocidade das animações</Label>
            <Select
              value={settings.animation_speed}
              onValueChange={(value: 'slow' | 'normal' | 'fast') => updateSetting('animation_speed', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Lenta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fast">Rápida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Reduzir movimento</Label>
              <p className="text-xs text-muted-foreground">
                Minimiza animações para acessibilidade
              </p>
            </div>
            <Switch
              checked={settings.reduce_motion}
              onCheckedChange={(checked) => updateSetting('reduce_motion', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Acessibilidade
          </CardTitle>
          <CardDescription>
            Configurações para melhor acessibilidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Contrast className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>Alto contraste</Label>
                <p className="text-xs text-muted-foreground">
                  Aumenta o contraste para melhor visibilidade
                </p>
              </div>
            </div>
            <Switch
              checked={settings.high_contrast}
              onCheckedChange={(checked) => updateSetting('high_contrast', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Layout e interface
          </CardTitle>
          <CardDescription>
            Personalize a disposição dos elementos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mostrar avatares</Label>
              <p className="text-xs text-muted-foreground">
                Exibir fotos de perfil nas conversas
              </p>
            </div>
            <Switch
              checked={settings.show_avatars}
              onCheckedChange={(checked) => updateSetting('show_avatars', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Modo compacto</Label>
              <p className="text-xs text-muted-foreground">
                Reduz espaçamento para mostrar mais conteúdo
              </p>
            </div>
            <Switch
              checked={settings.compact_mode}
              onCheckedChange={(checked) => updateSetting('compact_mode', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
              <Label>Posição da barra lateral</Label>
            </div>
            <Select
              value={settings.sidebar_position}
              onValueChange={(value: 'left' | 'right') => updateSetting('sidebar_position', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reset button */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurar padrões</CardTitle>
          <CardDescription>
            Redefine todas as configurações de aparência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={resetToDefault} variant="outline" className="w-full">
            Restaurar configurações padrão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};