import { createSignal, createEffect, onCleanup } from 'solid-js';
import { liveKitService, type CallInfo } from '../lib/livekit';
import { supabase } from '../lib/supabase';

export function useVideoCall() {
  const [isInCall, setIsInCall] = createSignal(false);
  const [callInfo, setCallInfo] = createSignal<CallInfo | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const generateToken = async (roomId: string, userId: string): Promise<string> => {
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
      throw new Error('Failed to generate token');
    }

    const data = await response.json();
    return data.token;
  };

  const startCall = async (receiverId: string, callType: 'video' | 'audio') => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await supabase.auth.getUser();
      const callerId = user.data.user?.id;

      if (!callerId) throw new Error('User not authenticated');

      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .insert({
          caller_id: callerId,
          receiver_id: receiverId,
          room_id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'calling',
          call_type: callType
        })
        .select()
        .single();

      if (callError) throw callError;

      const token = await generateToken(callData.room_id, callerId);

      const { error: tokenError } = await supabase
        .from('webrtc_tokens')
        .insert({
          call_id: callData.id,
          user_id: callerId,
          token: token,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        });

      if (tokenError) throw tokenError;

      const info: CallInfo = {
        roomId: callData.room_id,
        callType,
        callerId: callData.caller_id,
        receiverId: callData.receiver_id,
        callId: callData.id
      };

      setCallInfo(info);
      
      await sendCallNotification(info);

      return info;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar chamada');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptCall = async (callId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) throw new Error('User not authenticated');

      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .update({ 
          status: 'accepted',
          started_at: new Date().toISOString()
        })
        .eq('id', callId)
        .select()
        .single();

      if (callError) throw callError;

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
      setIsInCall(true);

      return { info, token };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar chamada');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectCall = async (callId: string) => {
    try {
      await supabase
        .from('video_calls')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      setCallInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar chamada');
    }
  };

  const endCall = async (callId: string) => {
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar chamada');
    }
  };

  const connectToRoom = async (token: string) => {
    try {
      await liveKitService.initializeRoom(token);
      setIsInCall(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar à sala');
      throw err;
    }
  };

  const sendCallNotification = async (callInfo: CallInfo) => {
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
  };

  return {
    isInCall,
    callInfo,
    isLoading,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    connectToRoom,
    toggleVideo: () => liveKitService.toggleVideo(),
    toggleAudio: () => liveKitService.toggleAudio(),
    room: liveKitService.getRoom()
  };
}