import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Video, Image, X, Upload, Smile, MapPin } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

type MediaType = 'image' | 'video' | 'camera';

export default function CreatePostModal({ open, onOpenChange, onPostCreated }: CreatePostModalProps) {
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

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
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
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: MediaType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
    setError('');
  };

  const removeMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const bucketName = 'message-files';
      const filePath = `post-media/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw new Error('Falha no upload da mídia');
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

    try {
      const penalty = await checkUserPenalty(user.id);
      if (penalty) {
        const expires = new Date(penalty.expires_at);
        const now = new Date();
        const hoursLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
        setError(`Você está proibido de postar por ${hoursLeft} horas`);
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar penalidade:', error);
    }

    setUploading(true);

    try {
      let mediaUrl = null;

      if (mediaFile) {
        try {
          mediaUrl = await uploadMedia(mediaFile);
        } catch (uploadError) {
          console.error('Erro no upload de mídia:', uploadError);
          setError('Erro ao fazer upload da mídia');
        }
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { error: insertError } = await supabase
        .from('posts')
        .insert([{ 
          user_id: user.id, 
          title: title.trim(),
          content: content.trim(),
          image_url: mediaUrl,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        }]);

      if (insertError) throw insertError;

      setTitle('');
      setContent('');
      removeMedia();
      onPostCreated();
      
    } catch (error) {
      console.error('Erro ao criar post:', error);
      setError('Erro ao criar postagem');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    removeMedia();
    setError('');
    setShowCamera(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            Criar Nova Postagem
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto space-y-4 p-1">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Título da postagem
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dê um título interessante..."
                className="bg-background"
                maxLength={100}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/100
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Conteúdo
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Compartilhe seus pensamentos..."
                rows={4}
                className="bg-background resize-none"
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/500
              </p>
            </div>

            {/* Seção de Mídia */}
            <div className="space-y-3">
              {/* Preview da Mídia */}
              {mediaPreview && (
                <div className="relative border border-border rounded-lg overflow-hidden">
                  {mediaType === 'video' ? (
                    <video 
                      src={mediaPreview} 
                      controls 
                      className="w-full max-h-64 object-cover"
                    />
                  ) : (
                    <img 
                      src={mediaPreview} 
                      alt="Preview" 
                      className="w-full max-h-64 object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={removeMedia}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-2 rounded-full hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Câmera Ativa */}
              {showCamera && (
                <div className="space-y-3 border border-border rounded-lg p-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button
                        type="button"
                        onClick={takePicture}
                        className="bg-white text-black hover:bg-gray-200 rounded-full p-4 shadow-lg"
                        size="icon"
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
                <div className="border border-border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Adicionar mídia</h4>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startCamera}
                      className="flex-1 flex-col h-16 gap-1"
                    >
                      <Camera className="h-5 w-5" />
                      <span className="text-xs">Câmera</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex-col h-16 gap-1"
                    >
                      <Image className="h-5 w-5" />
                      <span className="text-xs">Foto</span>
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'image')}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'video/*';
                        input.onchange = (e) => handleFileSelect(e as any, 'video');
                        input.click();
                      }}
                      className="flex-1 flex-col h-16 gap-1"
                    >
                      <Video className="h-5 w-5" />
                      <span className="text-xs">Vídeo</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!title.trim() || !content.trim() || uploading}
                  className="min-w-24"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Publicar
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              ⏰ Sua postagem ficará visível por 1 hora para votação da comunidade
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}