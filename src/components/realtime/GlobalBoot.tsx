import React from 'react';
import { Toaster } from 'sonner';
import { RealtimeAttentionListener } from '@/components/realtime/RealtimeAttentionListener';
import '@/styles/attention.css';

export function GlobalBoot() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <RealtimeAttentionListener />
    </>
  );
}
