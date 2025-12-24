# Como integrar o componente no seu front-end

1) Garanta que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estejam em `.env.local` na raiz do front (Vite) ou no local que seu bundler espera.
2) Importe e use o componente em alguma página passando a conversa atual:

```tsx
import ChatEphemeral from './src/components/ChatEphemeral';
// Você precisa obter a conversation via RPC get_or_create_dm_conversation() e passar como prop
```

3) Execute os SQLs da pasta `supabase_sql/` na ordem 01..05 no SQL Editor do Supabase.

4) As mensagens começam a contar 2min quando o destinatário visualizar (RPC mark_viewed). O cron limpa e marca como deletadas.

5) Detecção de idioma e botão Traduzir já vêm prontos no componente.