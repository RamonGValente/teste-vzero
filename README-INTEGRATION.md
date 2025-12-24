# Integração de chat com autodestruição + detecção/tradução de idioma

## Passos
1. Rode `supabase/sql/self_destruct.sql` no seu projeto (habilita trigger e cron).
2. Deploy da Edge Function `translate`:
   ```bash
   supabase functions deploy translate
   ```
   Configure no projeto as variáveis:
   - `TRANSLATE_API_URL`
   - `TRANSLATE_API_KEY` (se necessário)

3. Instale deps no frontend:
   ```bash
   npm i franc langs @supabase/supabase-js
   ```

4. Configure `.env.local` (Vite):
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

5. Importe e use o componente:
   ```tsx
   <ChatScreen conversationId={...} me={user.id} myLang="pt" />
   ```

Mensagens são apagadas 2min após `viewed_at`. O relógio aparece para ambos usuários.
