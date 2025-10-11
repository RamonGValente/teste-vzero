import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, UsersRound, Moon, Globe } from 'lucide-react';

export default function SidebarHeader() {
  const { pathname } = useLocation();
  const isActive = (href: string) =>
    pathname === href ? 'text-primary' : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-end gap-2 px-3 py-3">
      {/* ícone de tema (mantido) */}
      <button className="p-2 rounded-md hover:bg-muted" aria-label="Tema">
        <Moon className="w-4 h-4" />
      </button>

      {/* ícone globo (mantido) */}
      <button className="p-2 rounded-md hover:bg-muted" aria-label="Idioma">
        <Globe className="w-4 h-4" />
      </button>

      {/* Configurações — vai para a posição da Rede Social e fica DESATIVADO */}
      <button
        className="p-2 rounded-md text-muted-foreground cursor-default pointer-events-none"
        aria-disabled="true"
        title="Configurações desativado"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Rede Social — vai para a posição da Configuração e navega */}
      <Link
        to="/social"
        className={`p-2 rounded-md hover:bg-muted ${isActive('/social')}`}
        aria-label="Rede Social"
        title="Rede Social"
      >
        <UsersRound className="w-4 h-4" />
      </Link>
    </div>
  );
}
