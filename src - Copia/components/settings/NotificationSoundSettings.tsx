import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useNotificationSounds } from '@/hooks/useNotificationSounds';
import { Upload, Play, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationSoundSettings = () => {
  const { settings, loading, uploadSound, playSound } = useNotificationSounds();
  const messageFileRef = useRef<HTMLInputElement>(null);
  const attentionFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: 'message' | 'attention') => {
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Por favor, selecione um arquivo de áudio válido');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB permitido');
      return;
    }

    await uploadSound(file, type);
  };

  const handleMessageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'message');
    }
  };

  const handleAttentionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'attention');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sons de Notificação</CardTitle>
          <CardDescription>Carregando configurações...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Sons de Notificação
        </CardTitle>
        <CardDescription>
          Personalize os sons das suas notificações (arquivos MP3, WAV, OGG até 5MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Message Sound */}
        <div className="space-y-3">
          <Label htmlFor="message-sound">Som de Mensagens</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => messageFileRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {settings.message_sound_url ? 'Alterar Som' : 'Selecionar Som'}
            </Button>
            
            {settings.message_sound_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playSound('message')}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Testar
              </Button>
            )}
          </div>
          <input
            ref={messageFileRef}
            type="file"
            accept="audio/*"
            onChange={handleMessageFileSelect}
            className="hidden"
          />
          {settings.message_sound_url && (
            <p className="text-xs text-muted-foreground">
              Som personalizado configurado
            </p>
          )}
        </div>

        {/* Attention Sound */}
        <div className="space-y-3">
          <Label htmlFor="attention-sound">Som de Chamada de Atenção</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => attentionFileRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {settings.attention_sound_url ? 'Alterar Som' : 'Selecionar Som'}
            </Button>
            
            {settings.attention_sound_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playSound('attention')}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Testar
              </Button>
            )}
          </div>
          <input
            ref={attentionFileRef}
            type="file"
            accept="audio/*"
            onChange={handleAttentionFileSelect}
            className="hidden"
          />
          {settings.attention_sound_url && (
            <p className="text-xs text-muted-foreground">
              Som personalizado configurado
            </p>
          )}
        </div>

        {/* Test Default Sounds */}
        <div className="space-y-3 pt-4 border-t">
          <Label>Sons Padrão</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound('message')}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Testar Som de Mensagem
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound('attention')}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Testar Som de Atenção
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};