import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';

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

  async initializeRoom(token: string): Promise<Room> {
    this.room = new Room();
    
    this.room
      .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
      .on(RoomEvent.Disconnected, this.handleDisconnected)
      .on(RoomEvent.MediaDevicesError, this.handleMediaError);

    try {
      await this.room.connect(import.meta.env.VITE_LIVEKIT_URL, token);
      this.isConnected = true;
      
      if (this.room.localParticipant) {
        await this.room.localParticipant.setCameraEnabled(true);
        await this.room.localParticipant.setMicrophoneEnabled(true);
      }
      
      return this.room;
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
      throw error;
    }
  }

  private handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('Participant connected:', participant.identity);
  };

  private handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('Participant disconnected:', participant.identity);
  };

  private handleDisconnected = () => {
    console.log('Disconnected from room');
    this.isConnected = false;
    this.cleanup();
  };

  private handleMediaError = (error: Error) => {
    console.error('Media devices error:', error);
  };

  async toggleVideo(): Promise<void> {
    if (this.room?.localParticipant) {
      await this.room.localParticipant.setCameraEnabled(
        !this.room.localParticipant.isCameraEnabled
      );
    }
  }

  async toggleAudio(): Promise<void> {
    if (this.room?.localParticipant) {
      await this.room.localParticipant.setMicrophoneEnabled(
        !this.room.localParticipant.isMicrophoneEnabled
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      this.room.disconnect();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.room = null;
    this.isConnected = false;
  }

  getRoom(): Room | null {
    return this.room;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const liveKitService = new LiveKitService();