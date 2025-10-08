# Patch: ChatApp default import + PWA (/pwa/ scope)

## Import
- `src/components/chat/ChatApp.tsx`: export **default**
- `src/Index.tsx`: `import ChatApp from '@/components/chat/ChatApp'` (sem chaves)

## PWA (/pwa/)
- `src/pwa/register-sw.ts`: registra `'/pwa/sw.js'` com `scope: '/pwa/'`
- `public/manifest.webmanifest`: `"start_url": "/pwa/", "scope": "/pwa/"`
- Ícones válidos em `/pwa/icon-192.png` e `/pwa/icon-512.png`
- `_headers`: `Service-Worker-Allowed: /` (para ampliar o escopo se necessário na Netlify)

## HTML Head (Vite)
```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<!-- opcional: iOS -->
<meta name="apple-mobile-web-app-capable" content="yes">
```
