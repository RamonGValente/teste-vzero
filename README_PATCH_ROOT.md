# Patch: Import/Export + PWA (root scope)

## React imports
- `src/components/chat/ChatApp.tsx` export **default**
- `src/Index.tsx` importa **default**: `import ChatApp from '@/components/chat/ChatApp'`

## Service Worker (raiz)
- `public/sw.js` na raiz
- Registro: `navigator.serviceWorker.register('/sw.js', { scope: '/' })` em `src/pwa/register-sw.ts`

## Manifest (raiz)
- `public/manifest.webmanifest` com `"start_url": "/"` e `"scope": "/"`
- Ícones válidos incluídos: `/icon-192.png`, `/icon-512.png`

## HTML Head (Vite)
```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
```

Lembre: no Next.js use `metadata` ou o Head para o manifest.
