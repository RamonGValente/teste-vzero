import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Phone, Volume2, Vibrate, Mic, Shield, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CallSettingsProps {
  user: any;
}

interface CallConfig {
  ringtone: string;
  call_waiting: boolean;
  show_caller_id: boolean;
  vibrate_on_call: boolean;
  auto_answer: boolean;
  auto_answer_delay: number;
  call_recording: boolean;
  noise_cancellation: boolean;
  echo_cancellation: boolean;
  speaker_boost: boolean;
}

const ringtoneOptions = [
  { value: 'default', label: 'Padrão' },
  { value: 'classic', label: 'Clássico' },
  { value: 'modern', label: 'Moderno' },
  { value: 'gentle', label: 'Suave' },
  { value: 'upbeat', label: 'Animado' },
  { value: 'minimal', label: 'Minimalista' }
];

export const CallSettings = ({ user }: CallSettingsProps) => {
  const [settings, setSettings] = useState<CallConfig>({
    ringtone: 'default',
    call_waiting: true,
    show_caller_id: true,
    vibrate_on_call: true,
    auto_answer: false,
    auto_answer_delay: 5,
    call_recording: false,
    noise_cancellation: true,
    echo_cancellation: true,
    speaker_boost: false
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallSettings();
  }, [user]);

  const loadCallSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('call_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data as CallConfig);
      }
    } catch (error) {
      console.error('Error loading call settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof CallConfig, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('call_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      
      toast.success('Configuração de chamada atualizada');
    } catch (error) {
      console.error('Error updating call settings:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const testRingtone = () => {
    // This would play the selected ringtone
    toast.success('Reproduzindo toque selecionado...');
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
      {/* Ringtone settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Toque de chamada
          </CardTitle>
          <CardDescription>
            Configure o som das chamadas recebidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Toque selecionado</Label>
            <div className="flex gap-2">
              <Select
                value={settings.ringtone}
                onValueChange={(value) => updateSetting('ringtone', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ringtoneOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={testRingtone}>
                Testar
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <Label>Vibrar ao receber chamada</Label>
            </div>
            <Switch
              checked={settings.vibrate_on_call}
              onCheckedChange={(checked) => updateSetting('vibrate_on_call', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Call behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Comportamento das chamadas
          </CardTitle>
          <CardDescription>
            Configure como as chamadas são gerenciadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Chamada em espera</Label>
              <p className="text-xs text-muted-foreground">
                Permite receber outra chamada durante uma conversa
              </p>
            </div>
            <Switch
              checked={settings.call_waiting}
              onCheckedChange={(checked) => updateSetting('call_waiting', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mostrar ID do chamador</Label>
              <p className="text-xs text-muted-foreground">
                Exibir seu número para quem você liga
              </p>
            </div>
            <Switch
              checked={settings.show_caller_id}
              onCheckedChange={(checked) => updateSetting('show_caller_id', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Atender automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  Atende chamadas automaticamente após um tempo
                </p>
              </div>
              <Switch
                checked={settings.auto_answer}
                onCheckedChange={(checked) => updateSetting('auto_answer', checked)}
              />
            </div>

            {settings.auto_answer && (
              <div className="pl-4 space-y-2">
                <Label className="text-sm">
                  Delay: {settings.auto_answer_delay} segundos
                </Label>
                <Slider
                  value={[settings.auto_answer_delay]}
                  onValueChange={(value) => updateSetting('auto_answer_delay', value[0])}
                  max={15}
                  min={3}
                  step={1}
                  className="w-48"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audio quality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Qualidade de áudio
          </CardTitle>
          <CardDescription>
            Ajuste a qualidade do áudio das chamadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Cancelamento de ruído</Label>
              <p className="text-xs text-muted-foreground">
                Reduz ruído de fundo durante chamadas
              </p>
            </div>
            <Switch
              checked={settings.noise_cancellation}
              onCheckedChange={(checked) => updateSetting('noise_cancellation', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Cancelamento de eco</Label>
              <p className="text-xs text-muted-foreground">
                Elimina eco durante a conversa
              </p>
            </div>
            <Switch
              checked={settings.echo_cancellation}
              onCheckedChange={(checked) => updateSetting('echo_cancellation', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Amplificação do alto-falante</Label>
              <p className="text-xs text-muted-foreground">
                Aumenta o volume do alto-falante
              </p>
            </div>
            <Switch
              checked={settings.speaker_boost}
              onCheckedChange={(checked) => updateSetting('speaker_boost', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy and recording */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacidade e gravação
          </CardTitle>
          <CardDescription>
            Configurações de privacidade para chamadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Gravação de chamadas</Label>
              <p className="text-xs text-muted-foreground">
                Permite gravar chamadas (onde legalmente permitido)
              </p>
            </div>
            <Switch
              checked={settings.call_recording}
              onCheckedChange={(checked) => updateSetting('call_recording', checked)}
            />
          </div>

          {settings.call_recording && (
            <div className="pl-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                ⚠️ Certifique-se de que a gravação de chamadas é legal em sua região e 
                que você tem permissão de todos os participantes da chamada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};