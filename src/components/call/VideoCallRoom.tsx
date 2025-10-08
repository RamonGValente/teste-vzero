import { useState, useEffect, useRef } from 'react';
import { Room, RemoteParticipant } from 'livekit-client';
import { CallControls } from './CallControls';
import { useVideoCall } from '@/hooks/useVideoCall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, User, Video, Mic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VideoCallRoomProps {
  room: Room | null;
  callInfo: any;
  onEndCall: () => void;
}

export function VideoCallRoom({ room, callInfo, onEndCall }: VideoCallRoomProps) {
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);

  const { 
    toggleVideo, 
    toggleAudio, 
    localVideoEnabled, 
    localAudioEnabled 
  } = useVideoCall();

  useEffect(() => {
    if (!room) return;

    console.log('VideoCallRoom: Room initialized', room);

    const updateParticipants = () => {
      const participants = Array.from(room.remoteParticipants.values());
      setRemoteParticipants(participants);
      console.log('Participants updated:', participants.length);
      
      // Quando um participante se conecta, consideramos a conexão estabelecida
      if (participants.length > 0) {
        setIsConnecting(false);
      }
    };

    // Event listeners
    room.on('participantConnected', updateParticipants);
    room.on('participantDisconnected', updateParticipants);
    room.on('trackSubscribed', updateParticipants);
    room.on('trackUnsubscribed', updateParticipants);

    // Configurar elementos de vídeo inicial
    setupVideoElements();

    // Timeout para considerar conexão estabelecida mesmo sem participantes
    const timeout = setTimeout(() => {
      setIsConnecting(false);
    }, 5000);

    return () => {
      room.off('participantConnected', updateParticipants);
      room.off('participantDisconnected', updateParticipants);
      room.off('trackSubscribed', updateParticipants);
      room.off('trackUnsubscribed', updateParticipants);
      clearTimeout(timeout);
    };
  }, [room]);

  useEffect(() => {
    setupVideoElements();
  }, [remoteParticipants]);

  const setupVideoElements = () => {
    if (!room) return;

    const localParticipant = room.localParticipant;
    
    // Configurar vídeo local
    if (localParticipant && localVideoRef.current) {
      localParticipant.videoTrackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.videoTrack) {
          publication.videoTrack.attach(localVideoRef.current!);
        }
      });
    }

    // Configurar vídeos remotos
    remoteParticipants.forEach(participant => {
      participant.videoTrackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.videoTrack && remoteVideoContainerRef.current) {
          let videoElement = document.getElementById(`remote-video-${participant.identity}`) as HTMLVideoElement;
          
          if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.id = `remote-video-${participant.identity}`;
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.className = 'w-full h-full object-cover';
            remoteVideoContainerRef.current.appendChild(videoElement);
          }
          
          publication.videoTrack.attach(videoElement);
        }
      });
    });
  };

  if (!callInfo) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header da Chamada */}
      <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnecting ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
          <span className="text-lg font-semibold">
            {callInfo.callType === 'video' ? 'Videochamada' : 'Chamada de Voz'}
            {isConnecting && ' (Conectando...)'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onEndCall}>
          Sair
        </Button>
      </div>

      {/* Área Principal da Chamada */}
      <div className="flex-1 relative bg-black">
        {callInfo.callType === 'video' ? (
          <>
            {/* Vídeo Remoto */}
            <div 
              ref={remoteVideoContainerRef}
              className="absolute inset-0 flex items-center justify-center"
            >
              {remoteParticipants.length === 0 && (
                <div className="text-white text-center">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Aguardando participante...</p>
                </div>
              )}
            </div>
            
            {/* Vídeo Local (Picture-in-Picture) */}
            {localVideoEnabled && (
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            )}
          </>
        ) : (
          /* Tela de Chamada de Voz */
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="bg-background/80 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isConnecting ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  ) : (
                    <Phone className="h-10 w-10 text-primary" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {isConnecting ? 'Conectando...' : 'Chamada de Voz'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isConnecting ? 'Estabelecendo conexão...' : 'Chamada em andamento'}
                </p>
                
                {/* Informações dos Participantes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Mic className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {localAudioEnabled ? 'Microfone ativo' : 'Microfone mudo'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <CallControls
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onEndCall={onEndCall}
          isVideoEnabled={localVideoEnabled}
          isAudioEnabled={localAudioEnabled}
          callType={callInfo.callType}
        />
      </div>
    </div>
  );
}