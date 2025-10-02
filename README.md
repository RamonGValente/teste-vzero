# UndoinG - Chamadas (Netlify Ready)

## Deploy rápido

### 1) Supabase - Policies
Execute no SQL Editor o conteúdo do arquivo `db/policies_video_calls.sql`.

### 2) Supabase - Edge Function
Instale o CLI, faça link do projeto e rode:
```
supabase link --project-ref amkfdpyuaurfarxcrodx
supabase functions secrets set LIVEKIT_URL="wss://undoingvideochamada-d3fl2c6e.livekit.cloud"
supabase functions secrets set LIVEKIT_API_KEY="API8cf7rKjdF3P5"
supabase functions secrets set LIVEKIT_API_SECRET="<SEU_API_SECRET>"
supabase functions deploy generate-token
```

### 3) Netlify
- Variáveis de ambiente no site:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_LIVEKIT_URL
  - VITE_GENERATE_TOKEN_ENDPOINT = /functions/v1/generate-token
- O `netlify.toml` já cria o redirect do endpoint para a função do Supabase.

### 4) Build local
```
pnpm i
pnpm build
```
Publicar o repo no Netlify (build `vite build`, publish `dist`).

### 5) Teste
Abra duas sessões, faça login (OTP) e chame o outro usuário pelo UUID.
