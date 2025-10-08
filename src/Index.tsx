import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatApp from '@/components/chat/ChatApp'; // IMPORT DEFAULT (sem chaves)
import { registerSW } from '@/pwa/register-sw';

registerSW();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChatApp />
  </React.StrictMode>
);
