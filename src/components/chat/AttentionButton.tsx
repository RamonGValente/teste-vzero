
import * as React from "react";
import { sendAttentionCall, attentionErrorMessage } from "@/services/attentionCalls";

type Props = {
  receiverId: string;
  className?: string;
  label?: string;
  onSuccess?: (id: string) => void;
  onError?: (message: string) => void;
};

export default function AttentionButton({
  receiverId,
  className,
  label = "Chamar Atenção",
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = React.useCallback(async () => {
    if (!receiverId) {
      onError?.("Destinatário não informado.");
      return;
    }
    setLoading(true);
    try {
      const id = await sendAttentionCall(receiverId);
      onSuccess?.(id);
    } catch (e) {
      onError?.(attentionErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [receiverId, onSuccess, onError]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      title={label}
    >
      {loading ? "Enviando..." : label}
    </button>
  );
}
