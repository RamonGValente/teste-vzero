import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, PhoneOff, Video, Mic, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  if (!isVisible || !callInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-96 mx-4 animate-in fade-in-90 zoom-in-90">
        <CardContent className="p-6 text-center">
          {/* Avatar e Informações do Caller */}
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={callInfo.callerAvatar} />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-xl font-semibold mb-2">
              {callInfo.callerName}
            </h3>
            <p className="text-muted-foreground mb-1">
              Chamada {callInfo.callType === 'video' ? 'de Vídeo' : 'de Voz'}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {callInfo.callType === 'video' ? (
                <Video className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span>Chamando...</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={onReject}
              variant="destructive"
              size="lg"
              className="flex items-center gap-2 flex-1"
            >
              <PhoneOff className="h-5 w-5" />
              Recusar
            </Button>
            
            <Button
              onClick={onAccept}
              size="lg"
              className="flex items-center gap-2 flex-1 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-5 w-5" />
              Atender
            </Button>
          </div>

          {/* Indicador de Chamada Ativa */}
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-2 h-6 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}