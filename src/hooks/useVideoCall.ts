import { useState, useCallback, useRef } from 'react';
import { liveKitService, type CallInfo } from '@/lib/livekit';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useVideoCall() {
  const [isInCall, setIsInCall] = useState(false);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  
  const { toast } = useToast();
  const callTypeRef = useRef<'video' | 'audio'>('video');

  const generateToken = useCallback(async (roomId: string, userId: string): Promise<string> => {
    try {
      console.log('Generating token for room:', roomId, 'user:', userId);
      
      const response = await fetch('/.netlify/functions/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate token: ${errorText}`);
      }

      const data = await response.json();
      console.log('Token generated successfully');
      return data.token;
    } catch (err) {
      console.error('Token generation error:', err);
      throw err;
    }
  }, []);

  const startCall = useCallback(async (receiverId: string, callType: 'video' | 'audio') => {
    try {
      setIsLoading(true);
      setError(null);
      callTypeRef.current = callType;

      console.log('Starting call to:', receiverId, 'type:', callType);

      const { data: { user } } = await supabase.auth.getUser();
      const callerId = user?.id;

      if (!callerId) throw new Error('User not authenticated');

      // Criar room ID único
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .insert({
          caller_id: callerId,
          receiver_id: receiverId,
          room_id: roomId,
          status: 'calling',
          call_type: callType
        })
        .select()
        .single();

      if (callError) {
        console.error('Supabase call creation error:', callError);
        throw new Error(`Failed to create call: ${callError.message}`);
      }

      console.log('Call created in database:', callData);

      // Gerar token para o caller
      const token = await generateToken(roomId, callerId);

      const { error: tokenError } = await supabase
        .from('webrtc_tokens')
        .insert({
          call_id: callData.id,
          user_id: callerId,
          token: token,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        });

      if (tokenError) {
        console.error('Token storage error:', tokenError);
        throw new Error(`Failed to store token: ${tokenError.message}`);
      }

      const info: CallInfo = {
        roomId,
        callType,
        callerId,
        receiverId,
        callId: callData.id
      };

      setCallInfo(info);
      liveKitService.setCallType(callType === 'video');
      
      // Conectar à sala imediatamente para o caller
      await liveKitService.initializeRoom(token);
      setIsInCall(true);

      // Enviar notificação
      await sendCallNotification(info);

      toast({
        title: "Chamada Iniciada",
        description: `Chamada de ${callType === 'video' ? 'vídeo' : 'voz'} iniciada`,
      });

      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar chamada';
      setError(errorMessage);
      
      toast({
        title: "Erro na Chamada",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [generateToken, toast]);

  const acceptCall = useCallback(async (callId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Accepting call:', callId);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) throw new Error('User not authenticated');

      // Buscar informações da chamada
      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError) throw callError;

      // Atualizar status da chamada
      const { error: updateError } = await supabase
        .from('video_calls')
        .update({ 
          status: 'accepted',
          started_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (updateError) throw updateError;

      callTypeRef.current = callData.call_type;

      // Gerar token para o receiver
      const token = await generateToken(callData.room_id, userId);

      const { error: tokenError } = await supabase
        .from('webrtc_tokens')
        .insert({
          call_id: callId,
          user_id: userId,
          token: token,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        });

      if (tokenError) throw tokenError;

      const info: CallInfo = {
        roomId: callData.room_id,
        callType: callData.call_type,
        callerId: callData.caller_id,
        receiverId: callData.receiver_id,
        callId: callData.id
      };

      setCallInfo(info);
      liveKitService.setCallType(callData.call_type === 'video');
      
      // Conectar à sala
      await liveKitService.initializeRoom(token);
      setIsInCall(true);

      toast({
        title: "Chamada Atendida",
        description: "Você entrou na chamada",
      });

      return { info, token };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao aceitar chamada';
      setError(errorMessage);
      
      toast({
        title: "Erro ao Atender",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [generateToken, toast]);

  const rejectCall = useCallback(async (callId: string) => {
    try {
      console.log('Rejecting call:', callId);

      const { error } = await supabase
        .from('video_calls')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) throw error;

      setCallInfo(null);
      
      toast({
        title: "Chamada Recusada",
        description: "Chamada recusada com sucesso",
      });
    } catch (err) {
      console.error('Error rejecting call:', err);
      toast({
        title: "Erro",
        description: "Erro ao recusar chamada",
        variant: "destructive"
      });
    }
  }, [toast]);

  const endCall = useCallback(async (callId: string) => {
    try {
      console.log('Ending call:', callId);

      await supabase
        .from('video_calls')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      await liveKitService.disconnect();
      setIsInCall(false);
      setCallInfo(null);
      setLocalVideoEnabled(true);
      setLocalAudioEnabled(true);
      
      toast({
        title: "Chamada Finalizada",
        description: "Chamada encerrada com sucesso",
      });
    } catch (err) {
      console.error('Error ending call:', err);
      toast({
        title: "Erro",
        description: "Erro ao finalizar chamada",
        variant: "destructive"
      });
    }
  }, [toast]);

  const connectToRoom = useCallback(async (token: string) => {
    try {
      await liveKitService.initializeRoom(token);
      setIsInCall(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar à sala';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const sendCallNotification = useCallback(async (callInfo: CallInfo) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: callInfo.callerId,
          receiver_id: callInfo.receiverId,
          content: `Chamada de ${callInfo.callType === 'video' ? 'vídeo' : 'voz'}`,
          message_type: 'call_invite',
          call_id: callInfo.callId
        });

      if (error) {
        console.error('Error sending call notification:', error);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    try {
      const newState = await liveKitService.toggleVideo();
      setLocalVideoEnabled(newState);
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  }, []);

  const toggleAudio = useCallback(async () => {
    try {
      const newState = await liveKitService.toggleAudio();
      setLocalAudioEnabled(newState);
    } catch (err) {
      console.error('Error toggling audio:', err);
    }
  }, []);

  return {
    isInCall,
    callInfo,
    isLoading,
    error,
    localVideoEnabled,
    localAudioEnabled,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    connectToRoom,
    toggleVideo,
    toggleAudio,
    room: liveKitService.getRoom()
  };
}