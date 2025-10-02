# Chamadas (LiveKit + Supabase) integradas

- Botões adicionados em `src/components/chat/ChatWindow.tsx` ao lado do **ContactRanking**.
- Edge Function `generate-token` criada em `supabase/edge-functions/generate-token`.
- .envs preenchidos com as suas chaves (cliente e supabase/.env).
- SQL de RLS em `supabase/sql/rls_policies.sql`.

## Deploy da função
supabase functions deploy generate-token

## Execução local
supabase functions serve --env-file ./supabase/.env --no-verify-jwt