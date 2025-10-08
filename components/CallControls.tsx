import { Component } from 'solid-js';
import { Button } from './ui/button';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff,
  Phone
} from 'lucide-solid';

interface CallControlsProps {
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onEndCall: () => void;
  onAcceptCall?: () => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  showAcceptButton?: boolean;
}

export const CallControls: Component<CallControlsProps> = (props) => {
  return (
    <div class="flex items-center justify-center gap-4 p-4 bg-background/80 backdrop-blur-sm rounded-lg">
      <Button
        variant="outline"
        size="icon"
        onClick={props.onToggleVideo}
        class="w-12 h-12 rounded-full"
      >
        {props.isVideoEnabled ? (
          <Video class="h-5 w-5" />
        ) : (
          <VideoOff class="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={props.onToggleAudio}
        class="w-12 h-12 rounded-full"
      >
        {props.isAudioEnabled ? (
          <Mic class="h-5 w-5" />
        ) : (
          <MicOff class="h-5 w-5" />
        )}
      </Button>

      {props.showAcceptButton && (
        <Button
          onClick={props.onAcceptCall}
          class="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600"
          size="icon"
        >
          <Phone class="h-5 w-5" />
        </Button>
      )}

      <Button
        onClick={props.onEndCall}
        class="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
        size="icon"
      >
        <PhoneOff class="h-5 w-5" />
      </Button>
    </div>
  );
};