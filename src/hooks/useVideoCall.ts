import { createSignal, createEffect, onCleanup } from 'solid-js';
import { liveKitService, type CallInfo } from '../lib/livekit';
import { supabase } from '../lib/supabase';

export function useVideoCall() {
  const [isInCall, setIsInCall] = createSignal(false);
  const [callInfo, setCallInfo] = createSignal<CallInfo | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Iniciar uma chamada
  const startCall = async (receiverId: string, callType: 'video' | 'audio') => {
    try {
      setIsLoading(true);
      setError(null);

      // Criar registro da chamada no Supabase
      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .insert({
          caller_id: (await supabase.auth.getUser()).data.user?.id,
          receiver_id: receiverId,
          room_id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'calling',
          call_type: callType
        })
        .select()
        .single();

      if (callError) throw callError;

      // Gerar token para o caller
      const { data: tokenData, error: tokenError } = await supabase
        .from('webrtc_tokens')
        .insert({
          call_id: callData.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          token: await generateToken(callData.room_id, callData.caller_id),
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      const info: CallInfo = {
        roomId: callData.room_id,
        callType,
        callerId: callData.caller_id,
        receiverId: callData.receiver_id,
        callId: callData.id
      };

      setCallInfo(info);
      
      // Enviar notificação para o receiver
      await sendCallNotification(info);

      return info;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar chamada');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Aceitar uma chamada
  const acceptCall = async (callId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Atualizar status da chamada
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

      // Gerar token para o receiver
      const { data: tokenData, error: tokenError } = await supabase
        .from('webrtc_tokens')
        .insert({
          call_id: callId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          token: await generateToken(callData.room_id, callData.receiver_id),
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })
        .select()
        .single();

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

      return { info, token: tokenData.token };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar chamada');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Rejeitar uma chamada
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

  // Finalizar chamada
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

  // Conectar à sala LiveKit
  const connectToRoom = async (token: string) => {
    try {
      await liveKitService.initializeRoom(token);
      setIsInCall(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar à sala');
      throw err;
    }
  };

  // Gerar token JWT para LiveKit
  const generateToken = async (roomId: string, userId: string): Promise<string> => {
    const response = await fetch('/api/livekit-token', {
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

  // Enviar notificação de chamada
  const sendCallNotification = async (callInfo: CallInfo) => {
    // Enviar mensagem via Supabase Realtime
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: callInfo.callerId,
        receiver_id: callInfo.receiverId,
        content: `Chamada de ${callInfo.callType === 'video' ? 'vídeo' : 'voz'} incoming`,
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
    toggleAudio: () => liveKitService.toggleAudio()
  };
}