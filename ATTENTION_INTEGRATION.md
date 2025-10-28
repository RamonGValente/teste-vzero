# Integração do botão de Alerta (Chamar Atenção)

- Listener global e estilos adicionados.
- Botão de alerta inserido no cabeçalho do chat (área marcada em vermelho na imagem).
- Ajustes no composer (área verde) para espaçamento/alinhamento.

Se o alias `@` não existir no seu tsconfig, ajuste os imports dos arquivos adicionados em:
- `src/components/realtime/*`
- `src/hooks/useAttentionCalls.ts`
- `src/styles/attention.css`

Rode também a migração `supabase/attention_migration.sql` no seu projeto Supabase.
