import { Component, createSignal, createEffect, onCleanup, onMount } from 'solid-js';
import { Room, RemoteParticipant, LocalParticipant } from 'livekit-client';
import { CallControls } from './CallControls';
import { useVideoCall } from '../hooks/useVideoCall';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface VideoCallRoomProps {
  room: Room;
  callInfo: any;
  onEndCall: () => void;
}

export const VideoCallRoom: Component<VideoCallRoomProps> = (props) => {
  const [localVideoEnabled, setLocalVideoEnabled] = createSignal(true);
  const [localAudioEnabled, setLocalAudioEnabled] = createSignal(true);
  const [remoteParticipants, setRemoteParticipants] = createSignal<RemoteParticipant[]>([]);

  const { toggleVideo, toggleAudio } = useVideoCall();

  const handleToggleVideo = async () => {
    await toggleVideo();
    setLocalVideoEnabled(!localVideoEnabled());
  };

  const handleToggleAudio = async () => {
    await toggleAudio();
    setLocalAudioEnabled(!localAudioEnabled());
  };

  createEffect(() => {
    const room = props.room;
    
    const updateParticipants = () => {
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    };

    room.on('participantConnected', updateParticipants);
    room.on('participantDisconnected', updateParticipants);

    // Configurar elementos de vídeo
    setupVideoElements();

    onCleanup(() => {
      room.off('participantConnected', updateParticipants);
      room.off('participantDisconnected', updateParticipants);
    });
  });

  const setupVideoElements = () => {
    const localParticipant = props.room.localParticipant;
    
    // Elemento de vídeo local
    if (localParticipant && localParticipant.videoTrackPublications.size > 0) {
      const videoTrack = Array.from(localParticipant.videoTrackPublications.values())[0].videoTrack;
      if (videoTrack) {
        const localVideoElement = document.getElementById('local-video') as HTMLVideoElement;
        if (localVideoElement) {
          videoTrack.attach(localVideoElement);
        }
      }
    }

    // Elementos de vídeo remotos
    remoteParticipants().forEach(participant => {
      if (participant.videoTrackPublications.size > 0) {
        const videoTrack = Array.from(participant.videoTrackPublications.values())[0].videoTrack;
        if (videoTrack) {
          const remoteVideoElement = document.getElementById(`remote-video-${participant.identity}`) as HTMLVideoElement;
          if (remoteVideoElement) {
            videoTrack.attach(remoteVideoElement);
          }
        }
      }
    });
  };

  return (
    <div class="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <span class="text-lg font-semibold">
            {props.callInfo.callType === 'video' ? 'Videochamada' : 'Chamada de Voz'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={props.onEndCall}>
          Sair
        </Button>
      </div>

      {/* Área de Vídeo */}
      <div class="flex-1 relative bg-black">
        {/* Vídeo Remoto */}
        <div class="absolute inset-0 flex items-center justify-center">
          {remoteParticipants().map(participant => (
            <video
              id={`remote-video-${participant.identity}`}
              class="w-full h-full object-cover"
              autoplay
              playsinline
            />
          ))}
        </div>

        {/* Vídeo Local (Picture-in-Picture) */}
        {props.callInfo.callType === 'video' && (
          <div class="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-primary">
            <video
              id="local-video"
              class="w-full h-full object-cover"
              autoplay
              playsinline
              muted
            />
          </div>
        )}

        {/* Overlay para chamada de áudio */}
        {props.callInfo.callType === 'audio' && (
          <div class="absolute inset-0 flex items-center justify-center">
            <Card class="bg-background/80 backdrop-blur-sm">
              <CardContent class="p-8 text-center">
                <div class="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone class="h-10 w-10 text-primary" />
                </div>
                <h3 class="text-xl font-semibold mb-2">Chamada de Voz</h3>
                <p class="text-muted-foreground">Conectado</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Controles */}
      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <CallControls
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          onEndCall={props.onEndCall}
          isVideoEnabled={localVideoEnabled()}
          isAudioEnabled={localAudioEnabled()}
        />
      </div>
    </div>
  );
};