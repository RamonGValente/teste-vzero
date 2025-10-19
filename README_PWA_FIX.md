
# Correção PWA (Android)

- **Manifesto válido** em `public/manifest.webmanifest` com ícones 192/512px, `display: standalone`, `start_url: "/"`, `scope: "/"`.
- **Ícones** garantidos em `public/icon-192.png` e `public/icon-512.png` (gerados se faltavam).
- **Service Worker** via `vite-plugin-pwa` com `injectRegister: 'script'` e `autoUpdate`. Em dev, `devOptions.enabled: true` para testar.
- **Prompt de instalação**: componente `src/components/PWAInstallPrompt.tsx` escuta `beforeinstallprompt` e mostra o banner. Incluído no topo do `App.tsx`.

## Como testar no Android (Chrome)
1. Rode `bun dev` ou `npm run dev` e acesse pelo celular Android em **HTTPs ou via LAN** (use `https://` se possível). Em produção use HTTPS.
2. Acesse o app 1-2 vezes. Você verá o banner "Instalar app".
3. Alternativo: use o menu ⋮ do Chrome → **Adicionar à tela inicial**.

## Build
```
bun run build    # ou npm run build
bun run preview  # ou npm run preview
```
