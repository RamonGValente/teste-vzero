# UNDOING — pacote completo (detecção/tradução + autoexclusão)

## 1) Edge Function
- Pasta: `supabase/functions/detect-translate/index.ts`
- Deploy: `supabase functions deploy detect-translate`
- CORS liberado: localhost, https://undoing.com.br, https://sistemaapp.netlify.app e *.netlify.app

## 2) Front
- Coloque `src/services/translation.ts`
- Coloque `src/styles/undoing.css` e mantenha o `import "@/styles/undoing.css"` no `Messages.tsx`

## 3) Autoexclusão
Você já executou o SQL. A UI precisa das injeções descritas em:
- `patches/Messages_injections.md`

Essas injeções:
- iniciam `expires_at` no servidor ao visualizar (`mark_message_viewed`);
- mostram **timer** regressivo (mm:ss);
- chamam `expire_and_delete_message` ao zerar (delete imediato);
- exibem **🔒** e, 10s depois, **UnDoInG** (também garantido pelo cron do servidor).

## 4) Teste de CORS
- Preflight OPTIONS deve responder 204 (a Function já faz isso).
- Se usar outro domínio, adicione no array `ALLOWED_EXACT` dentro do `index.ts`.
