
# Chamar Atenção — Pacote Completo (TS/TSX)

## Servidor (Supabase)
- RPC `attention_call_create`: idempotência por par (30s) + cooldown global 10 min
- TTL 30s: `prune_old_attention_calls` + agendamento via pg_cron (se disponível)
- ACK: `attention_call_ack` e `attention_call_ack_many` — apagam no recebimento

## Frontend
- `src/services/attentionCalls.ts`: enviar, ouvir coalescido (1 por remetente/30s), auto-ack
- `src/components/chat/AttentionButton.tsx`: botão TSX pronto
- `src/hooks/useAttentionListeners.ts`: inicia carga inicial + realtime com auto-ack

### Uso rápido (TSX)
```tsx
import AttentionButton from "@/components/chat/AttentionButton";
import { useAttentionListeners } from "@/hooks/useAttentionListeners";

type Props = { currentUserId: string; receiverId: string; };
export default function ChatHeader({ currentUserId, receiverId }: Props) {
  useAttentionListeners(currentUserId, (call) => {
    // toast.info(`🔔 Atenção de ${call.sender_id}`);
  });

  return (
    <div className="flex items-center gap-2">
      <AttentionButton
        receiverId={receiverId}
        className="px-3 py-2 rounded-xl border"
        label="Chamar Atenção"
        onSuccess={() => console.log("Alerta enviado!")}
        onError={(msg) => console.error(msg)}
      />
    </div>
  );
}
```
