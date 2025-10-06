import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.449ba0d5500c4c128666f3db4263c1b0',
  appName: 'undoing',
  webDir: 'dist',
  server: {
    url: 'https://449ba0d5-500c-4c12-8666-f3db4263c1b0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    ScreenProtection: {
      enabled: true,
      preventScreenshots: true,
      preventScreenRecording: true
    }
  }
};

export default config;