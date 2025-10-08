import React from 'react';
import Sidebar from '@/components/chat/Sidebar';

export default function ChatApp() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-4">
        <h1 className="text-xl font-bold">Chat</h1>
        <p>Selecione uma conversa na barra lateral.</p>
      </main>
    </div>
  );
}
