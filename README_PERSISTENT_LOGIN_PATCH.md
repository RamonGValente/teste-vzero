
# Patch: Remover logout por inatividade e tornar o login persistente

## O que este patch faz
- `useIdleLogout` vira **NO-OP** (sem timers, sem signOut).
- Supabase client com persistência local (`persistSession: true`).

## Como aplicar
1. Extraia este patch por cima do projeto.
2. Sem alterar `App.tsx`, chamadas a `useIdleLogout()` deixam de ter efeito.
3. Garanta envs: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`).

## Observações
- Remova quaisquer `signOut()` em handlers de `beforeunload`/`pagehide`, se existirem.
