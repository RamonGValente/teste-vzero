# UndoinG - Chamadas (Netlify + npm + Tailwind)

## Deploy (Netlify)
- Variáveis de ambiente:
  - `VITE_SUPABASE_URL` = https://amkfdpyuaurfarxcrodx.supabase.co
  - `VITE_SUPABASE_ANON_KEY` = (sua anon key)
  - `VITE_LIVEKIT_URL` = wss://undoingvideochamada-d3fl2c6e.livekit.cloud
  - `VITE_GENERATE_TOKEN_ENDPOINT` = /functions/v1/generate-token
- Build:
  - Install: `npm install`
  - Build: `npm run build`
  - Publish: `dist`

## Supabase
```
supabase link --project-ref amkfdpyuaurfarxcrodx
supabase functions secrets set LIVEKIT_URL="wss://undoingvideochamada-d3fl2c6e.livekit.cloud"
supabase functions secrets set LIVEKIT_API_KEY="API8cf7rKjdF3P5"
supabase functions secrets set LIVEKIT_API_SECRET="<SEU_API_SECRET>"
supabase functions deploy generate-token
```
Execute `db/policies_video_calls.sql` no SQL Editor.

## Obs
- Tailwind/PostCSS incluídos para evitar falha de build se houver `postcss.config.js`.
- PWA/SW não habilitado.
