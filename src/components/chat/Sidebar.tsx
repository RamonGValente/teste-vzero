import React from 'react';

export interface SidebarProps {
  onSelectChat?: (id: string) => void;
  className?: string;
}

export default function Sidebar({ onSelectChat, className }: SidebarProps) {
  return (
    <aside className={className || 'w-64 border-r h-full p-4'}>
      <h2 className="font-semibold mb-2">Conversas</h2>
      <ul className="space-y-2">
        <li>
          <button onClick={() => onSelectChat?.('demo')} className="underline">
            Chat de exemplo
          </button>
        </li>
      </ul>
    </aside>
  );
}
