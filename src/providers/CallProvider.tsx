import React, { createContext, useContext, ReactNode } from 'react';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { IncomingCallNotification } from '@/components/call/IncomingCallNotification';
import { VideoCallRoom } from '@/components/call/VideoCallRoom';

interface CallContextType {
  videoCall: ReturnType<typeof useVideoCall>;
  incomingCalls: {
    call: any;
    accept: () => Promise<void>;
    reject: () => Promise<void>;
  };
}

const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const videoCall = useVideoCall();
  const incomingCalls = useIncomingCalls();

  const handleAcceptCall = async () => {
    const call = incomingCalls.incomingCall;
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
    const call = incomingCalls.incomingCall;
    if (call) {
      await videoCall.rejectCall(call.id);
      incomingCalls.setIncomingCall(null);
    }
  };

  const value: CallContextType = {
    videoCall,
    incomingCalls: {
      call: incomingCalls.incomingCall,
      accept: handleAcceptCall,
      reject: handleRejectCall
    }
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      
      {incomingCalls.incomingCall && !videoCall.isInCall && (
        <IncomingCallNotification
          callInfo={incomingCalls.incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          isVisible={!!incomingCalls.incomingCall}
        />
      )}

      {videoCall.isInCall && videoCall.callInfo && (
        <VideoCallRoom
          room={videoCall.room}
          callInfo={videoCall.callInfo}
          onEndCall={() => videoCall.endCall(videoCall.callInfo!.callId)}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}