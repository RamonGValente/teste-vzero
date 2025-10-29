
# Melhorias de 'Chamar Atenção' — Sistema Completo
- **Cooldown global**: 1 alerta por remetente a cada **10 minutos**.
- **Idempotência por par**: se já existir alerta do mesmo remetente→destinatário nos **últimos 30s**, não cria outro.
- **TTL 30s**: alertas são excluídos após 30s (pg_cron agendado ou função agendada).
- **Coalescência no cliente**: ao logar e em tempo real, mostra **no máximo 1 notificação por remetente** em uma janela de 30s.

## Uso no Frontend
```ts
import { startAttentionListeners } from "@/services/attentionCalls";

let stop: null | (() => void) = null;

async function onLogin(userId: string) {
  stop = await startAttentionListeners(userId, (call) => {
    // exiba UM toast por remetente / 30s
    // toast.info(`🔔 Atenção de ${call.sender_id}`);
  });
}

function onLogout() {
  if (stop) stop();
  stop = null;
}
```

## Migrações
- `*_attention_call_base.sql` cria índice, políticas e função de limpeza + agenda cron (se disponível).
- `*_attention_call_idempotent_per_pair.sql` atualiza o RPC `attention_call_create` com idempotência + cooldown.
```
-- Teste rápido:
select public.attention_call_create('UUID-DO-DESTINATARIO', 'olá');
```

## Componentes TSX prontos
- `src/components/chat/AttentionButton.tsx`
- `src/hooks/useAttentionListeners.ts`

### Exemplo (TSX)
```tsx
import AttentionButton from "@/components/chat/AttentionButton";
import { useAttentionListeners } from "@/hooks/useAttentionListeners";

type Props = { currentUserId: string; receiverId: string; };
export default function ChatHeader({ currentUserId, receiverId }: Props) {
  useAttentionListeners(currentUserId, (call) => {
    console.log("Atenção:", call);
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
