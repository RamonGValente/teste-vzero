
import * as React from "react";
import { startAttentionListenersAutoAck } from "@/services/attentionCalls";

type AttentionCall = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  created_at: string;
};

export function useAttentionListeners(
  currentUserId: string | null | undefined,
  onCall: (call: AttentionCall) => void
) {
  React.useEffect(() => {
    let stop: null | (() => void) = null;
    (async () => {
      if (!currentUserId) return;
      stop = await startAttentionListenersAutoAck(currentUserId, onCall);
    })();
    return () => {
      if (stop) stop();
      stop = null;
    };
  }, [currentUserId, onCall]);
}
