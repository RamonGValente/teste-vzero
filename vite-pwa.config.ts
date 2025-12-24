import { VitePWAOptions } from 'vite-plugin-pwa';

export const pwaOptions: Partial<VitePWAOptions> = {
  // Registro manual (via virtual:pwa-register) para conseguirmos:
  // 1) exibir o prompt de atualização APÓS login
  // 2) ter botão "Atualizar" confiável em todos navegadores/PWA
  injectRegister: null,
  devOptions: { enabled: true },
  // "prompt" mantém o novo SW em waiting e dispara onNeedRefresh
  // (o botão "Atualizar" chama updateServiceWorker(true)).
  registerType: 'prompt',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'sounds/*'],
  manifest: {
    name: 'UDG',
    short_name: 'UDG',
    description: 'Chat social e comunidades em tempo real',
    start_url: '/',
    scope: '/',
    id: '/',
    theme_color: '#9F7AEA',
    background_color: '#1A1626',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'fullscreen'],
    prefer_related_applications: false,
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      { src: 'icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' }
    ]
  },
  workbox: {
    importScripts: ['sw-push.js'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-storage',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
    ],
  },
};
