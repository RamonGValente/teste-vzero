
# Patch: Chat clássico + Tradução inline + UnDoInG + Likes 403 Fix

## O que muda
- **`src/pages/Messages.tsx`**: volta o layout clássico (lista de conversas à esquerda, chat à direita), **auto‑seleciona** a primeira conversa e inclui:
  - Botão **Traduzir** (mostra "Idioma de origem: ..." + tradução logo abaixo em cor diferente);
  - **Excluir** com estado **UnDoInG (10s)** e **auditoria** em `message_deletions_user`.
- **Rota** `/messages` apontando para `Messages` novamente.
- **SQL** `supabase/migrations/20251109_likes_policies.sql` para corrigir **403** no endpoint REST `/rest/v1/likes` (RLS + policies).

## Como aplicar
1. Substitua os arquivos do `src/pages/Messages.tsx`, `src/services/translation.ts` e `src/styles/undoing.css`.
2. Confirme que `src/App.tsx` usa `<Messages />` em `/messages`.
3. No Supabase (SQL editor), rode o conteúdo de `supabase/migrations/20251109_likes_policies.sql`.
4. Garanta o secret `OPENAI_API_KEY` na Edge Function e o deploy da função `translate` ativo.

## Observações
- O ocultamento de mensagens é **por usuário** (registro em `message_deletions_user`).
- Para listar mensagens já filtrando exclusões do usuário no SQL, use a view `v_messages_visible` (se já criada anteriormente).
