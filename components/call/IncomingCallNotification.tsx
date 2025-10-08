import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";

interface IncomingCallNotificationProps {
  callInfo: any;
  onAccept: () => void;
  onReject: () => void;
  isVisible: boolean;
}

export function IncomingCallNotification({ 
  callInfo, 
  onAccept, 
  onReject, 
  isVisible 
}: IncomingCallNotificationProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-96 mx-4">
        <CardContent className="p-6 text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {callInfo.callType === 'video' ? (
              <Video className="h-10 w-10 text-primary" />
            ) : (
              <Mic className="h-10 w-10 text-primary" />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2">
            Chamada {callInfo.callType === 'video' ? 'de Vídeo' : 'de Voz'}
          </h3>
          <p className="text-muted-foreground mb-2">
            {callInfo.callerName} está chamando...
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {callInfo.callType === 'video' ? 'Videochamada' : 'Chamada de voz'}
          </p>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={onReject}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              Recusar
            </Button>
            
            <Button
              onClick={onAccept}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4" />
              Atender
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}