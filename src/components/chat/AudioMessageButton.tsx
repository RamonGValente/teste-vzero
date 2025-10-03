import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { uploadAudioForChat } from '@/lib/uploadAudio';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState, useEffect, useRef } from 'react';

interface Props {
  contactId: string;
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file' | 'audio', fileUrl?: string) => void;
}

export const AudioMessageButton = ({ contactId, onSendMessage }: Props) => {
  const { user } = useAuth();
  const rec = useAudioRecorder();
  const [sending, setSending] = useState(false);
const pendingRef = useRef(false);

// after stop, when lastRecording becomes available, upload and send
useEffect(() => {
  if (!user) return;
  if (rec.isRecording) return;
  if (!rec.lastRecording) return;
  if (sending) return;

  // prevent duplicate sends
  if (pendingRef.current) return;
  pendingRef.current = true;

  (async () => {
    setSending(true);
    try {
      const uploaded = await uploadAudioForChat(rec.lastRecording!.blob, {
        senderId: user.id,
        receiverId: contactId,
        mimeType: rec.lastRecording!.mimeType,
      });
      if (uploaded?.url) {
        onSendMessage('🎙️ Mensagem de áudio', 'audio', uploaded.url);
      }
    } finally {
      setSending(false);
      pendingRef.current = false;
    }
  })();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [rec.lastRecording, rec.isRecording, user, contactId]);


  const handleClick = async () => {
  if (!user) return;
  if (!rec.isRecording) {
    await rec.start();
  } else {
    rec.stop(); // the useEffect above will pick up lastRecording and send
  }
};

  return (
    <Button
      type="button"
      size="icon"
      variant={rec.isRecording ? 'destructive' : 'secondary'}
      className="ml-2"
      onClick={handleClick}
      disabled={sending}
      title={rec.isRecording ? 'Parar gravação' : 'Gravar áudio'}
    >
      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : rec.isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};
