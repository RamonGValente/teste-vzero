import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, Video, Image, X, Upload } from 'lucide-react';

interface CreatePostProps {
  onPostCreated: () => void;
}

type MediaType = 'image' | 'video' | 'camera';

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checkUserPenalty = async (userId: string) => {
    const { data: penalty } = await supabase
      .from('user_penalties')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single();

    return penalty;
  };

  // Iniciar câmera
  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setMediaType('camera');
    } catch (err) {
      setError('Não foi possível acessar a câmera');
      console.error('Erro ao acessar câmera:', err);
    }
  };

  // Parar câmera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Tirar foto
  const takePicture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setMediaFile(file);
          setMediaPreview(URL.createObjectURL(blob));
          stopCamera();
          setMediaType('image');
        }
      }, 'image/jpeg', 0.8);
    }
  };

  // Manipular seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: MediaType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar tamanho do arquivo (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
    setError('');
  };

  // Remover mídia
  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload de arquivo para Supabase Storage
  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `post-media/${fileName}`;

      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: true });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!title.trim() || !content.trim()) {
      setError('Título e conteúdo são obrigatórios');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    // Verificar penalidade
    const penalty = await checkUserPenalty(user.id);
    if (penalty) {
      const expires = new Date(penalty.expires_at);
      const now = new Date();
      const hoursLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      setError(`Você está proibido de postar por ${hoursLeft} horas`);
      return;
    }

    setUploading(true);

    try {
      let mediaUrl = null;

      // Fazer upload da mídia se existir
      if (mediaFile) {
        mediaUrl = await uploadMedia(mediaFile);
      }

      // Calcular expiração (1 hora)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { error } = await supabase
        .from('posts')
        .insert([{ 
          user_id: user.id, 
          title: title.trim(),
          content: content.trim(),
          image_url: mediaUrl,
          expires_at: expiresAt.toISOString()
        }]);

      if (error) throw error;

      // Limpar formulário
      setTitle('');
      setContent('');
      removeMedia();
      onPostCreated();
      
    } catch (error) {
      console.error('Erro ao criar post:', error);
      setError(`Erro ao criar postagem: ${error?.message ?? ''}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Criar Nova Postagem</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded">
            {error}
          </div>
        )}
        
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da postagem"
          className="w-full p-2 border border-border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={100}
          required
        />
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Conteúdo da postagem..."
          rows={3}
          className="w-full p-2 border border-border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          required
        />

        {/* Seção de Mídia */}
        <div className="space-y-3">
          {/* Preview da Mídia */}
          {mediaPreview && (
            <div className="relative">
              {mediaType === 'video' ? (
                <video 
                  src={mediaPreview} 
                  controls 
                  className="w-full rounded-lg max-h-64 object-cover"
                />
              ) : (
                <img 
                  src={mediaPreview} 
                  alt="Preview" 
                  className="w-full rounded-lg max-h-64 object-cover"
                />
              )}
              <button
                type="button"
                onClick={removeMedia}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Câmera Ativa */}
          {showCamera && (
            <div className="space-y-2">
              <div className="relative bg-black rounded-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <Button
                    type="button"
                    onClick={takePicture}
                    className="bg-white text-black hover:bg-gray-200 rounded-full p-4"
                  >
                    <Camera className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={stopCamera}
                className="w-full"
              >
                Cancelar Câmera
              </Button>
            </div>
          )}

          {/* Botões de Mídia */}
          {!showCamera && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Câmera
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Image className="h-4 w-4 mr-2" />
                Foto
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileSelect(e, 'image')}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/*';
                  input.onchange = (e) => handleFileSelect(e as any, 'video');
                  input.click();
                }}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Vídeo
              </Button>
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={!title.trim() || !content.trim() || uploading}
          className="w-full bg-primary text-primary-foreground py-2 rounded text-sm hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Criar Post (1h)
            </>
          )}
        </button>
        
        <p className="text-xs text-muted-foreground text-center">
          A postagem ficará ativa por 1 hora para votação
        </p>
      </form>
    </div>
  );
}