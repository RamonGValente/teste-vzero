
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { Camera, Mic, Video, Paperclip, Send } from 'lucide-react';

interface MediaMessageInputProps {
  onSendMessage: (content: string, type: 'text' | 'image' | 'file' | 'audio', fileUrl?: string) => void;
}

export const MediaMessageInput = ({ onSendMessage }: MediaMessageInputProps) => {
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const uploadFile = async (file: File, type: 'image' | 'file' | 'audio') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      // Send message with file URL
      onSendMessage(file.name, type, data.publicUrl);
      
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file' | 'audio') => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file, type);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.wav`, { type: 'audio/wav' });
        await uploadFile(audioFile, 'audio');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      toast.info('Gravação iniciada...');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erro ao iniciar gravação');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      toast.success('Gravação finalizada!');
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t">
      {/* Photo/Image Upload */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Enviar foto"
      >
        <Camera className="h-4 w-4" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />

      {/* Video Upload */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => videoInputRef.current?.click()}
        disabled={uploading}
        title="Enviar vídeo"
      >
        <Video className="h-4 w-4" />
      </Button>
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => handleFileSelect(e, 'file')}
        className="hidden"
      />

      {/* Audio Recording */}
      <Button
        variant="ghost"
        size="sm"
        onClick={recording ? stopRecording : startRecording}
        disabled={uploading}
        className={recording ? 'text-red-500 animate-pulse' : ''}
        title={recording ? 'Parar gravação' : 'Gravar áudio'}
      >
        <Mic className="h-4 w-4" />
      </Button>

      {/* File Upload */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => audioInputRef.current?.click()}
        disabled={uploading}
        title="Enviar arquivo"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <input
        ref={audioInputRef}
        type="file"
        onChange={(e) => handleFileSelect(e, 'file')}
        className="hidden"
      />

      {uploading && (
        <div className="text-xs text-muted-foreground">
          Enviando...
        </div>
      )}
    </div>
  );
};
