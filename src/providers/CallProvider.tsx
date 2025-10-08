import { Component, createContext, useContext, createSignal, Show } from 'solid-js';
import { useVideoCall } from '../hooks/useVideoCall';
import { useIncomingCalls } from '../hooks/useIncomingCalls';
import { IncomingCallNotification } from '../components/IncomingCallNotification';
import { VideoCallRoom } from '../components/VideoCallRoom';

const CallContext = createContext();

export const CallProvider: Component<{ children: any }> = (props) => {
  const videoCall = useVideoCall();
  const incomingCalls = useIncomingCalls();

  const handleAcceptCall = async () => {
    const call = incomingCalls.incomingCall();
    if (call) {
      try {
        const { token } = await videoCall.acceptCall(call.id);
        await videoCall.connectToRoom(token);
        incomingCalls.setIncomingCall(null);
      } catch (error) {
        console.error('Error accepting call:', error);
      }
    }
  };

  const handleRejectCall = async () => {
    const call = incomingCalls.incomingCall();
    if (call) {
      await videoCall.rejectCall(call.id);
      incomingCalls.setIncomingCall(null);
    }
  };

  const value = {
    videoCall,
    incomingCalls: {
      call: incomingCalls.incomingCall,
      accept: handleAcceptCall,
      reject: handleRejectCall
    }
  };

  return (
    <CallContext.Provider value={value}>
      {props.children}
      
      <Show when={incomingCalls.incomingCall() && !videoCall.isInCall()}>
        <IncomingCallNotification
          callInfo={incomingCalls.incomingCall()}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          isVisible={!!incomingCalls.in