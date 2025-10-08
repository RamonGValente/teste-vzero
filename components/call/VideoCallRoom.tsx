import { useState, useEffect, useRef } from 'react';
import { Room, RemoteParticipant } from 'livekit-client';
import { CallControls } from './CallControls';
import { useVideoCall } from '@/hooks/useVideoCall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';

interface VideoCallRoomProps {
  room: Room | null;
  callInfo: any;
  onEndCall: () => void;
}

export function VideoCallRoom({ room, callInfo, onEndCall }: VideoCallRoomProps) {
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);

  const { toggleVideo, toggleAudio } = useVideoCall();

  const handleToggleVideo = async () => {
    await toggleVideo();
    setLocalVideoEnabled(!localVideoEnabled);
  };

  const handleToggleAudio = async () => {
    await toggleAudio();
    setLocalAudioEnabled(!localAudioEnabled);
  };

  useEffect(() => {
    if (!room) return;

    const updateParticipants = () => {
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    };

    room.on('participantConnected', updateParticipants);
    room.on('participantDisconnected', updateParticipants);

    updateParticipants();

    return () => {
      room.off('participantConnected', updateParticipants);
      room.off('participantDisconnected', updateParticipants);
    };
  }, [room]);

  useEffect(() => {
    setupVideoElements();
  }, [room, remoteParticipants]);

  const setupVideoElements = () => {
    if (!room) return;

    const localParticipant = room.localParticipant;
    
    // Setup local video
    if (localParticipant && localVideoRef.current) {
      localParticipant.videoTrackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.videoTrack) {
          publication.videoTrack.attach(localVideoRef.current!);
        }
      });
    }

    // Setup remote videos
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

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-lg font-semibold">
            {callInfo.callType === 'video' ? 'Videochamada' : 'Chamada de Voz'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onEndCall}>
          Sair
        </Button>
      </div>

      <div className="flex-1 relative bg-black">
        {callInfo.callType === 'video' ? (
          <>
            <div 
              ref={remoteVideoContainerRef}
              className="absolute inset-0 flex items-center justify-center"
            />
            
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-primary">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="bg-background/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Chamada de Voz</h3>
                <p className="text-muted-foreground">Conectado</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <CallControls
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          onEndCall={onEndCall}
          isVideoEnabled={localVideoEnabled}
          isAudioEnabled={localAudioEnabled}
        />
      </div>
    </div>
  );
}