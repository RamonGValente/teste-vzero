# Correção: erro inesperado ao logar (listener de atenção)

## 1) Supabase
Execute uma vez:
- `supabase/sql/04_attention_realtime_fix.sql`
  - Adiciona `public.attention_calls` na publicação `supabase_realtime`
  - Define `replica identity full` para payloads completos

## 2) Frontend
- Substitua `src/components/realtime/RealtimeAttentionListener.tsx` por este.
  - Evita canais duplicados e captura exceções no callback para não derrubar a UI.
- (Opcional) Envolva seu app com `ErrorBoundary` de `src/components/system/ErrorBoundary.tsx`.

## 3) Por que isso corrige
- Se a tabela não estava na publicação do realtime, eventos não chegavam/chegavam incompletos.
- Se múltiplos listeners eram montados no login (HMR/roteamento), canal duplicado podia causar erro.
