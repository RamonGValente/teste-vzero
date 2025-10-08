# Patch de Correção (Sidebar + PWA)

## 1) Sidebar / ChatApp
- `src/components/chat/Sidebar.tsx`: **export default**
- `src/components/chat/ChatApp.tsx`: `import Sidebar from '@/components/chat/Sidebar'`

Se não usa alias `@`, troque por caminho relativo, por ex:
```ts
import Sidebar from '../../components/chat/Sidebar'
```

## 2) PWA
- `src/pwa/register-sw.ts` registra `'/pwa/sw.js'` com `scope: '/pwa/'`.
- `public/manifest.webmanifest` com `start_url` e `scope` = `'/pwa/'`.
- `public/pwa/sw.js` service worker simples.
- `_headers` (Netlify): permite `Service-Worker-Allowed: /` caso queira que SW controle '/'.

### HTML Head (Vite)
No `index.html`, adicione:
```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<!-- (opcional ainda para iOS) -->
<meta name="apple-mobile-web-app-capable" content="yes">
```

### Next.js (layout)
No `app/layout.tsx`:
```tsx
export const metadata = {
  manifest: '/manifest.webmanifest',
  icons: [{ rel: 'icon', url: '/pwa/icon-192.png' }],
};
```

## 3) Uso
- Importe `registerSW` em seu bootstrap (ex.: `main.tsx` ou `_app.tsx`) e chame `registerSW()`.
