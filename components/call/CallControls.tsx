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
}

export function CallControls({ 
  onToggleVideo, 
  onToggleAudio, 
  onEndCall, 
  onAcceptCall,
  isVideoEnabled, 
  isAudioEnabled,
  showAcceptButton = false 
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-background/80 backdrop-blur-sm rounded-lg">
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleVideo}
        className="w-12 h-12 rounded-full"
      >
        {isVideoEnabled ? (
          <Video className="h-5 w-5" />
        ) : (
          <VideoOff className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleAudio}
        className="w-12 h-12 rounded-full"
      >
        {isAudioEnabled ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </Button>

      {showAcceptButton && (
        <Button
          onClick={onAcceptCall}
          className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600"
          size="icon"
        >
          <Phone className="h-5 w-5" />
        </Button>
      )}

      <Button
        onClick={onEndCall}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
        size="icon"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}