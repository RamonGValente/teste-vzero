# Sistema PWA – Upgrade pronto para produção

Este pacote substitui **apenas o sistema do PWA** (service worker, manifest, registro e lógica de instalação), sem alterar sua página de download do app.  
Funciona em **Android, iOS/iPadOS (A2HS), Windows, macOS e Linux** (Chrome/Edge/Firefox/Brave).

## Conteúdo

```
public/
  ├─ manifest.webmanifest
  ├─ sw.js
  ├─ offline.html
  └─ icons/
      ├─ icon-192.png
      ├─ icon-256.png
      ├─ icon-384.png
      └─ icon-512.png
src/pwa/
  ├─ registerSW.js
  ├─ install.js
  └─ index.d.ts
```

## Como integrar (sem alterar sua página atual)

1) **Copie** `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html` e a pasta `public/icons` para a pasta pública do seu projeto (ex.: `public/` em React/Vite/Next).
2) **Inclua o manifest** no `<head>` do seu HTML raiz (ou no layout global do framework):
```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0f172a">

<!-- iOS (A2HS) -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```
3) **Registre o Service Worker** no ponto de entrada do app (ex.: `main.tsx`, `_app.tsx`):
```js
import { registerSW } from "/src/pwa/registerSW.js";

registerSW({
  onNeedRefresh: (refresh) => {
    // Mostre um toast/modal na SUA página existente pedindo para atualizar.
    // Ao confirmar:
    refresh();
  },
  onOfflineReady: () => {
    // Mostre um toast "Disponível offline".
  },
  onUpdated: () => window.location.reload()
});
```
4) **Habilite a experiência de instalação** na SUA página existente (sem alterá-la estruturalmente):  
Basta usar os helpers:
```js
import { setupInstallDetector, promptInstall } from "/src/pwa/install.js";

setupInstallDetector({
  onChange: (state) => {
    // state.canInstall -> true quando o browser suportar "instalar"
    // state.iosA2HS -> true em iOS Safari (mostrar instruções de A2HS)
    // Use isso para habilitar o botão "Instalar" da sua página.
  }
});

// Ao clicar no botão "Instalar":
const result = await promptInstall();
// result.outcome: 'accepted' | 'dismissed' | 'unsupported'
```
5) **Deploy** com cabeçalhos corretos (muito importante):
- `sw.js` e `manifest.webmanifest` com `Content-Type` válidos (`text/javascript` / `application/manifest+json`).
- **Nunca** faça proxy/cdn que mude o `scope` do SW.

## O que melhorou

- **Instalação universal**: `beforeinstallprompt` + fallback iOS (A2HS) + desktop.
- **Desempenho**: navegação com *Navigation Preload* + *Stale-While-Revalidate* para recursos GET.
- **Offline real**: `offline.html` para *navigations* e cache inteligente de imagens.
- **Atualizações suaves**: `onNeedRefresh` com `skipWaiting` e `controllerchange` para evitar travas de versão.
- **Compatível com Supabase/REST**: cache SWR para GET cross-origin sem quebrar autenticação (POST/PUT continuam passando direto).

## Dicas avançadas

- Adicione seus bundles estáticos em `CORE_ASSETS` no `sw.js` para pré-cache (hashes de arquivo são ideais).
- Para páginas privadas, prefira **runtime caching** (já configurado) e um *offline.html* genérico.
- Se usar Next.js/Remix, mantenha `sw.js` no `public/` raiz com `scope="/"`.
- Ícones podem ser trocados por versões da sua marca (substitua os PNGs mantendo as dimensões).

---

Gerado em: 2025-09-30T03:12:12.665576Z


## Dev nos cenários solicitados

### 1) Localhost HTTP/HTTPS
- **Funciona** com SW e instalação em `https://localhost` **ou** em `http://localhost` (exceção de segurança dos navegadores).
- Se seu dev server suportar: rode com HTTPS (ex.: Vite `--https`, Next `HTTPS=true` com proxy).

### 2) LAN pelo IP `http://192.168.2.116`
- Por política dos navegadores, **Service Worker e o prompt de instalação exigem HTTPS** fora de `localhost`.
- Portanto, em **HTTP puro no IP**, o pacote **desabilita** o SW automaticamente e mantém o app funcionando sem offline/instalação.
- Para ter PWA completo na LAN:
  - **Vite:** `vite --host 192.168.2.116 --https` (use **mkcert** para certificados locais confiáveis).
  - **mkcert (exemplo)**:
    ```bash
    mkcert -install
    mkcert 192.168.2.116
    # configure seu dev server (Vite/webpack/Next) para usar os arquivos .pem gerados
    ```
  - **Netlify CLI (proxy HTTPS):** `netlify dev` (publica em https://localhost e repassa para o seu app).

### 3) Deploy na Netlify
- Incluímos `netlify.toml` e `/_headers` com tipos corretos e cache seguro para `sw.js` e `manifest`.
- Passos:
  1. Crie o site na Netlify (conecte o repositório) e **defina `build.publish = "public"`** (ou ajuste conforme seu framework).
  2. Garanta que `sw.js` esteja em `public/` no deploy final.
  3. (SPA) Se usa roteamento client-side, descomente o bloco de **redirect SPA** no `netlify.toml`.

> Dica: O `registerSW.js` agora detecta contexto inseguro e evita erros em `http://192.168.2.116`, exibindo orientação no console para habilitar HTTPS local.
