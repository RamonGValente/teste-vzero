# UndoinG - Chamadas (Netlify + npm)

## 📦 Conteúdo
- Vite + React + TypeScript
- Supabase (singleton client, Realtime listener)
- LiveKit (join helper)
- UI simples para iniciar/aceitar chamadas
- `netlify.toml` com redirect para a Supabase Edge Function
- Policies SQL (RLS)
- Função `generate-token` (fonte de referência)
- `.nvmrc` = Node 20, `.gitignore`

## 🚀 Deploy (Netlify)
1. Configure as variáveis de ambiente do site (Site settings → Environment):
   - `VITE_SUPABASE_URL` = https://amkfdpyuaurfarxcrodx.supabase.co
   - `VITE_SUPABASE_ANON_KEY` = (sua anon key)
   - `VITE_LIVEKIT_URL` = wss://undoingvideochamada-d3fl2c6e.livekit.cloud
   - `VITE_GENERATE_TOKEN_ENDPOINT` = /functions/v1/generate-token
2. **Build settings**:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. O `netlify.toml` já faz o redirect para a função do Supabase.

## 🗄️ Supabase
### Policies (SQL)
Abra o SQL Editor e execute `db/policies_video_calls.sql`.

### Edge Function (secrets + deploy)
```
supabase link --project-ref amkfdpyuaurfarxcrodx
supabase functions secrets set LIVEKIT_URL="wss://undoingvideochamada-d3fl2c6e.livekit.cloud"
supabase functions secrets set LIVEKIT_API_KEY="API8cf7rKjdF3P5"
supabase functions secrets set LIVEKIT_API_SECRET="<SEU_API_SECRET>"
supabase functions deploy generate-token
```
A função ficará em:
`https://amkfdpyuaurfarxcrodx.functions.supabase.co/generate-token`

## ▶️ Teste
- Abra o site em duas sessões, faça login por OTP.
- Inicie uma chamada informando o UUID do destinatário.
- O convite chega em tempo real; ao aceitar, ambos entram na sala do LiveKit.

## 🛠️ Notas
- PWA/Service Worker desativado por padrão (evita erro de escopo).
- Garantir que `profiles.id == auth.users.id` para RLS funcionar conforme esperado.
- Não existe `pnpm-lock.yaml`. Use **npm** como solicitado.
