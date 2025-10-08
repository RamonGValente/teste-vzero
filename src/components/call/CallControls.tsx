import { Button } from "@/components/ui/button";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff,
  Phone
} from "lucide-react";

interface CallControlsProps {
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onEndCall: () => void;
  onAcceptCall?: () => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  showAcceptButton?: boolean;
  callType?: 'video' | 'audio';
}

export function CallControls({ 
  onToggleVideo, 
  onToggleAudio, 
  onEndCall, 
  onAcceptCall,
  isVideoEnabled, 
  isAudioEnabled,
  showAcceptButton = false,
  callType = 'video'
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-background/80 backdrop-blur-sm rounded-lg border">
      {/* Botão de Vídeo (apenas para videochamadas) */}
      {callType === 'video' && (
        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="icon"
          onClick={onToggleVideo}
          className="w-12 h-12 rounded-full"
          title={isVideoEnabled ? "Desligar câmera" : "Ligar câmera"}
        >
          {isVideoEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Botão de Áudio */}
      <Button
        variant={isAudioEnabled ? "default" : "destructive"}
        size="icon"
        onClick={onToggleAudio}
        className="w-12 h-12 rounded-full"
        title={isAudioEnabled ? "Desligar microfone" : "Ligar microfone"}
      >
        {isAudioEnabled ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </Button>

      {/* Botão Aceitar Chamada (apenas para receiver) */}
      {showAcceptButton && (
        <Button
          onClick={onAcceptCall}
          className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600"
          size="icon"
          title="Atender chamada"
        >
          <Phone className="h-5 w-5" />
        </Button>
      )}

      {/* Botão Finalizar Chamada */}
      <Button
        onClick={onEndCall}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
        size="icon"
        title="Finalizar chamada"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}