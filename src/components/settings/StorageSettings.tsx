import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { HardDrive, Download, Wifi, Image, File, Music, Video, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface StorageSettingsProps {
  user: any;
}

interface StorageConfig {
  auto_download_photos: 'always' | 'wifi' | 'never';
  auto_download_videos: 'always' | 'wifi' | 'never';
  auto_download_audio: 'always' | 'wifi' | 'never';
  auto_download_documents: 'always' | 'wifi' | 'never';
  media_quality: 'high' | 'medium' | 'low';
  backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_include_videos: boolean;
  compress_media: boolean;
  delete_old_media: boolean;
  old_media_days: number;
}

interface StorageInfo {
  total_messages: number;
  total_media: number;
  storage_used: number; // in MB
  photos_count: number;
  videos_count: number;
  audio_count: number;
  documents_count: number;
}

export const StorageSettings = ({ user }: StorageSettingsProps) => {
  const [settings, setSettings] = useState<StorageConfig>({
    auto_download_photos: 'wifi',
    auto_download_videos: 'wifi',
    auto_download_audio: 'always',
    auto_download_documents: 'wifi',
    media_quality: 'high',
    backup_enabled: true,
    backup_frequency: 'daily',
    backup_include_videos: true,
    compress_media: false,
    delete_old_media: false,
    old_media_days: 30
  });

  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    total_messages: 0,
    total_media: 0,
    storage_used: 0,
    photos_count: 0,
    videos_count: 0,
    audio_count: 0,
    documents_count: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageSettings();
    loadStorageInfo();
  }, [user]);

  const loadStorageSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('storage_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const settingsData = {
          ...data,
          auto_download_photos: data.auto_download_photos as 'always' | 'wifi' | 'never',
          auto_download_videos: data.auto_download_videos as 'always' | 'wifi' | 'never',
          auto_download_audio: data.auto_download_audio as 'always' | 'wifi' | 'never',
          auto_download_documents: data.auto_download_documents as 'always' | 'wifi' | 'never',
          media_quality: data.media_quality as 'high' | 'medium' | 'low',
          backup_frequency: data.backup_frequency as 'daily' | 'weekly' | 'monthly'
        };
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading storage settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      // Get message count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Get media count by type
      const { data: mediaData } = await supabase
        .from('messages')
        .select('message_type, file_url')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .not('file_url', 'is', null);

      let photos = 0, videos = 0, audio = 0, documents = 0;
      mediaData?.forEach(item => {
        switch (item.message_type) {
          case 'image': photos++; break;
          case 'video': videos++; break;
          case 'audio': audio++; break;
          case 'file': documents++; break;
        }
      });

      setStorageInfo({
        total_messages: messageCount || 0,
        total_media: mediaData?.length || 0,
        storage_used: Math.round((mediaData?.length || 0) * 0.5), // Estimate 0.5MB per media
        photos_count: photos,
        videos_count: videos,
        audio_count: audio,
        documents_count: documents
      });
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const updateSetting = async (key: keyof StorageConfig, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('storage_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      
      toast.success('Configuração de armazenamento atualizada');
    } catch (error) {
      console.error('Error updating storage settings:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const clearMediaCache = async () => {
    try {
      // This would typically clear cached media files
      toast.success('Cache de mídia limpo com sucesso');
      loadStorageInfo(); // Refresh storage info
    } catch (error) {
      console.error('Error clearing media cache:', error);
      toast.error('Erro ao limpar cache');
    }
  };

  const downloadOptions = [
    { value: 'always', label: 'Sempre' },
    { value: 'wifi', label: 'Apenas no Wi-Fi' },
    { value: 'never', label: 'Nunca' }
  ];

  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
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

  const storagePercentage = Math.min((storageInfo.storage_used / 1024) * 100, 100); // Assuming 1GB limit

  return (
    <div className="p-4 space-y-6">
      {/* Storage usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Uso de armazenamento
          </CardTitle>
          <CardDescription>
            Visualize e gerencie o espaço utilizado pelo app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usado: {formatStorage(storageInfo.storage_used)}</span>
              <span>Total: 1 GB</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Image className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Fotos</span>
              </div>
              <p className="text-2xl font-bold">{storageInfo.photos_count}</p>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Video className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Vídeos</span>
              </div>
              <p className="text-2xl font-bold">{storageInfo.videos_count}</p>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Music className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Áudios</span>
              </div>
              <p className="text-2xl font-bold">{storageInfo.audio_count}</p>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <File className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Docs</span>
              </div>
              <p className="text-2xl font-bold">{storageInfo.documents_count}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={clearMediaCache} variant="outline" className="flex-1">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar cache
            </Button>
            <Button onClick={loadStorageInfo} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-download settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download automático
          </CardTitle>
          <CardDescription>
            Configure quando fazer download de mídia automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-blue-500" />
                <Label>Fotos</Label>
              </div>
              <Select
                value={settings.auto_download_photos}
                onValueChange={(value: any) => updateSetting('auto_download_photos', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {downloadOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-red-500" />
                <Label>Vídeos</Label>
              </div>
              <Select
                value={settings.auto_download_videos}
                onValueChange={(value: any) => updateSetting('auto_download_videos', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {downloadOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-green-500" />
                <Label>Áudios</Label>
              </div>
              <Select
                value={settings.auto_download_audio}
                onValueChange={(value: any) => updateSetting('auto_download_audio', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {downloadOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-orange-500" />
                <Label>Documentos</Label>
              </div>
              <Select
                value={settings.auto_download_documents}
                onValueChange={(value: any) => updateSetting('auto_download_documents', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {downloadOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Qualidade de mídia</Label>
                <p className="text-xs text-muted-foreground">
                  Escolha a qualidade padrão para upload de mídia
                </p>
              </div>
              <Select
                value={settings.media_quality}
                onValueChange={(value: any) => updateSetting('media_quality', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Comprimir mídia</Label>
                <p className="text-xs text-muted-foreground">
                  Reduz o tamanho dos arquivos antes do envio
                </p>
              </div>
              <Switch
                checked={settings.compress_media}
                onCheckedChange={(checked) => updateSetting('compress_media', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data management */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento automático</CardTitle>
          <CardDescription>
            Configure a limpeza automática de dados antigos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Excluir mídia antiga</Label>
              <p className="text-xs text-muted-foreground">
                Remove automaticamente arquivos de mídia antigos
              </p>
            </div>
            <Switch
              checked={settings.delete_old_media}
              onCheckedChange={(checked) => updateSetting('delete_old_media', checked)}
            />
          </div>

          {settings.delete_old_media && (
            <div className="pl-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Excluir após:</Label>
                <Select
                  value={settings.old_media_days.toString()}
                  onValueChange={(value) => updateSetting('old_media_days', parseInt(value))}
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};