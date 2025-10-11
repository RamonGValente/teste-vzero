# Alerta "Chamar Atenção" — somente para usuários ONLINE, com hora e sem fila atrasada

## 1) Rode no Supabase
- Execute `supabase/sql/03_attention_online_only.sql`

Cria:
- `is_user_online(u, ttl)`
- RLS: só permite INSERT quando o recebedor está online
- RPC `send_attention(receiver, message)`

## 2) No app
- Para enviar o alerta, use `sendAttention(receiverId, message?)` de `src/services/attentionService.ts`.
  - Se o contato estiver offline, retorna erro amigável e **não** cria registro.
- Substitua/atualize seu `RealtimeAttentionListener` pelo deste pacote:
  - Mostra a **hora** na notificação.
  - Ignora alertas **antigos** (>90s) ao logar — nada de fila atrasada.

## 3) Observação
- Se você fazia `insert` direto na tabela, pode continuar (a RLS bloqueia offline), mas recomendo usar a RPC.
