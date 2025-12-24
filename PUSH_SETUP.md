# Push + PWA (UDG) — OneSignal (Web SDK v16)

Este projeto usa **OneSignal Web Push v16**.
✅ **Não usa VAPID/Web Push manual.**

---

## 1) Variáveis no Netlify

Em **Site settings → Environment variables**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`

Depois, faça **Clear cache and deploy**.

> O front lê o `ONESIGNAL_APP_ID` via `/.netlify/functions/app-config` (runtime), então você não fica dependente de `VITE_*` no build.

---

## 2) Service Worker

- O Service Worker do PWA é **`/sw.js`** (gerado pelo `vite-plugin-pwa`).
- Ele importa `public/sw-push.js` via `workbox.importScripts`.
- O `public/sw-push.js` importa o SW do OneSignal:
  `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js`

---

## 3) OneSignal (Dashboard)

No painel do OneSignal:

1. Configure **Web Push** para o domínio do seu site (Netlify) e também para o domínio local, se for testar.
2. Garanta que o site esteja servindo em HTTPS.
3. O app usa **External User ID** = `supabase.auth.user().id`.

---

## 4) Preferências do usuário (Supabase)

As funções usam a tabela `notification_preferences` para respeitar o que o usuário quer receber.

Se você ainda não criou essa tabela, aplique as migrations em:
`supabase/migrations/20251223000000_onesignal_notification_preferences.sql`
`supabase/migrations/20251223010000_add_posts_comments_to_notification_preferences.sql`

---

## 5) Problemas comuns (sem “gambiarras”)

Se aparecer erro de armazenamento (IndexedDB), normalmente é **PWA/dados corrompidos**:
- Limpar dados do site
- Remover o PWA e instalar de novo
- Evitar navegador embutido do WhatsApp/Instagram
