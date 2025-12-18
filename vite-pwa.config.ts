import { VitePWAOptions } from 'vite-plugin-pwa';

export const pwaOptions: Partial<VitePWAOptions> = {
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.js',
injectRegister: 'script',
  devOptions: { enabled: true, type: 'module' },
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico','icon-192.png','icon-512.png','icons/icon-72.png','sounds/alertasom.mp3','sounds/push.mp3'],
  manifest: {
    name: 'UDG',
    short_name: 'UDG',
    description: 'UDG',
    theme_color: '#9F7AEA',
    background_color: '#1A1626',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/ipmldkprqdhybedhpgmt\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7
          }
        }
      }
    ]
  }
};
