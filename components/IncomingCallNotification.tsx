import { Component, Show } from 'solid-js';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Phone, PhoneOff, Video, Mic } from 'lucide-solid';

interface IncomingCallNotificationProps {
  callInfo: any;
  onAccept: () => void;
  onReject: () => void;
  isVisible: boolean;
}

export const IncomingCallNotification: Component<IncomingCallNotificationProps> = (props) => {
  if (!props.isVisible) return null;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card class="w-96 mx-4">
        <CardContent class="p-6 text-center">
          <div class="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {props.callInfo.callType === 'video' ? (
              <Video class="h-10 w-10 text-primary" />
            ) : (
              <Mic class="h-10 w-10 text-primary" />
            )}
          </div>

          <h3 class="text-xl font-semibold mb-2">
            Chamada {props.callInfo.callType === 'video' ? 'de Vídeo' : 'de Voz'}
          </h3>
          <p class="text-muted-foreground mb-2">
            {props.callInfo.callerName} está chamando...
          </p>
          <p class="text-sm text-muted-foreground mb-6">
            {props.callInfo.callType === 'video' ? 'Videochamada' : 'Chamada de voz'}
          </p>

          <div class="flex gap-3 justify-center">
            <Button
              onClick={props.onReject}
              variant="destructive"
              class="flex items-center gap-2"
            >
              <PhoneOff class="h-4 w-4" />
              Recusar
            </Button>
            
            <Button
              onClick={props.onAccept}
              class="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Phone class="h-4 w-4" />
              Atender
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};