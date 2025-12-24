# Patch: Exclusão com "UnDoInG" + Tradução inline + Auditoria no Supabase

## O que foi adicionado
- **Página `MessagesEnhanced.tsx`**: substitui a rota `/messages` com:
  - Botão **Traduzir** por mensagem: detecta idioma (via função Edge) e renderiza a tradução **abaixo** do texto original, com rótulo "Idioma de origem: ...". A tradução aparece com cor diferente (classe `.translated-text`).
  - Ação **Excluir**: ao clicar, a mensagem é substituída por um estado animado **“UnDoInG (10s)”** (`.undoing`). Após 10s, a mensagem fica **oculta para o usuário** e é gravada em **`message_deletions_user`** no Supabase para auditoria.
- **Supabase Edge Function `translate`** (`supabase/functions/translate/index.ts`): usa OpenAI (modelo `gpt-4o-mini`) para traduzir e retornar JSON (texto traduzido + idioma origem + destino).
- **Serviço `src/services/translation.ts`**: invoca a função Edge.
- **Estilos `src/styles/undoing.css`**: animação e cor da tradução.
- **Migração SQL** `supabase/migrations/20251108_message_deletions_user.sql`: cria tabela de auditoria e view `v_messages_visible`.

## Como usar
1. **Supabase**
   - Crie a função Edge `translate`: `supabase functions deploy translate --no-verify-jwt` e defina a variável `OPENAI_API_KEY` no ambiente de funções.
   - Rode a migração criada (copie o SQL para o editor SQL do Supabase e execute).
2. **App**
   - A rota `/messages` agora aponta para `MessagesEnhanced` (alterado em `src/App.tsx`).
   - Sem dependências novas: tudo é feito com o que já existe + função Edge.

## Observações
- O ocultamento é **por usuário**: não altera `messages.is_deleted`. O log completo fica em `message_deletions_user`.
- Para listar mensagens desconsiderando exclusões do usuário direto no banco, use a **view** `v_messages_visible`.