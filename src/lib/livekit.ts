import { Room, RoomEvent, RemoteParticipant, LocalTrack, LocalVideoTrack, LocalAudioTrack } from 'livekit-client';

export interface CallInfo {
  roomId: string;
  callType: 'video' | 'audio';
  callerId: string;
  receiverId: string;
  callId: string;
}

export class LiveKitService {
  private room: Room | null = null;
  private isConnected = false;
  private localVideoTrack: LocalVideoTrack | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;

  async initializeRoom(token: string): Promise<Room> {
    try {
      this.room = new Room({
        // Configurações otimizadas para melhor performance
        adaptiveStream: true,
        dynacast: true,
      });
      
      // Configurar event listeners
      this.setupRoomEvents();

      console.log('Connecting to LiveKit room with token:', token);
      
      await this.room.connect(import.meta.env.VITE_LIVEKIT_URL, token, {
        // Configurações de conexão
        autoSubscribe: true,
      });
      
      this.isConnected = true;
      console.log('Successfully connected to LiveKit room');

      // Iniciar mídia local baseada no tipo de chamada
      if (this.room.localParticipant) {
        try {
          // Sempre habilitar áudio para chamadas de voz e vídeo
          await this.room.localParticipant.setMicrophoneEnabled(true);
          
          // Habilitar vídeo apenas para videochamadas
          if (this.isVideoCall()) {
            await this.room.localParticipant.setCameraEnabled(true);
          }
        } catch (mediaError) {
          console.warn('Media device error:', mediaError);
          // Continuar mesmo sem dispositivos de mídia
        }
      }
      
      return this.room;
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
      this.cleanup();
      throw error;
    }
  }

  private setupRoomEvents() {
    if (!this.room) return;

    this.room
      .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
      })
      .on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        this.isConnected = false;
        this.cleanup();
      })
      .on(RoomEvent.MediaDevicesError, (error: Error) => {
        console.error('Media devices error:', error);
      })
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log('Local track published:', publication.track?.kind);
      })
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        console.log('Local track unpublished:', publication.track?.kind);
      });
  }

  private isVideoCall(): boolean {
    // Esta função será sobrescrita pelo hook
    return true;
  }

  async toggleVideo(): Promise<boolean> {
    if (!this.room?.localParticipant) return false;

    try {
      const isEnabled = this.room.localParticipant.isCameraEnabled;
      await this.room.localParticipant.setCameraEnabled(!isEnabled);
      return !isEnabled;
    } catch (error) {
      console.error('Error toggling video:', error);
      return false;
    }
  }

  async toggleAudio(): Promise<boolean> {
    if (!this.room?.localParticipant) return false;

    try {
      const isEnabled = this.room.localParticipant.isMicrophoneEnabled;
      await this.room.localParticipant.setMicrophoneEnabled(!isEnabled);
      return !isEnabled;
    } catch (error) {
      console.error('Error toggling audio:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    // Limpar tracks locais
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack = null;
    }
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }

    this.room = null;
    this.isConnected = false;
  }

  getRoom(): Room | null {
    return this.room;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  // Método para definir o tipo de chamada
  setCallType(isVideo: boolean) {
    this.isVideoCall = () => isVideo;
  }
}

export const liveKitService = new LiveKitService();