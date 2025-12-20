# Push + PWA (UDG)

## 1) Variáveis de ambiente

### Front-end (Vite)
Defina **apenas** a public key:
- `VITE_VAPID_PUBLIC_KEY`

### Netlify (Functions)
Defina no Netlify (Site settings → Environment variables):
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (opcional, se alguma função usar)
- `PUBLIC_SITE_URL` (ex: `https://sistemaapp.netlify.app`)

> A **VAPID_PRIVATE_KEY NUNCA vai no front**.

## 2) Como o push chega no Sistema Operacional
- As notificações do SO são disparadas pelo `Service Worker` (`public/sw-push.js`) via `registration.showNotification()`.
- Com esta versão, mesmo com o app aberto, também reforçamos via `new Notification(...)` no foreground.

## 3) iPhone (iOS)
Push na web exige iOS relativamente recente e, na prática, é mais confiável quando o app está **instalado** (Adicionar à Tela Inicial) e o usuário habilita Notificações.

## 4) Android (incluindo Xiaomi)
Se não aparecer “Instalar app”:
- Garanta que está abrindo no **Chrome verdadeiro**, não dentro do WhatsApp/Instagram.
- Recarregue a página 1 vez para o SW controlar (o prompt aparece depois disso em alguns modelos).
- Use o banner interno do app (ele aparece quando o navegador dispara `beforeinstallprompt`).
