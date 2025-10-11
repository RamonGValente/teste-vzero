import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings, UsersRound, Menu } from 'lucide-react';
import SidebarContacts from '@/components/social/SidebarContacts';

export default function AppTopBar() {
  const { pathname } = useLocation();
  const isActive = (href: string) =>
    pathname === href ? 'text-primary' : 'text-muted-foreground';

  return (
    <header className="w-full border-b bg-background/60 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex items-center justify-between px-3 sm:px-4 h-14">
        {/* Hambúrguer → abre a mesma lateral do app */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menu">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[320px] sm:w-[360px]">
            <div className="h-full overflow-y-auto">
              <SidebarContacts />
            </div>
          </SheetContent>
        </Sheet>

        <div className="font-semibold tracking-tight select-none">
          UndoinG
        </div>

        {/* ORDEM TROCADA: Configurações (desativado) | Rede Social */}
        <nav className="flex items-center gap-1">
          {/* Configurações — DESATIVADO */}
          <Button
            variant="ghost"
            className="px-2 py-1 rounded-md cursor-default pointer-events-none text-muted-foreground"
            aria-disabled="true"
            title="Configurações desativado"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Configurações</span>
          </Button>

          {/* Rede Social — ATIVO */}
          <Link
            to="/social"
            className={`px-2 py-1 rounded-md hover:bg-muted ${isActive('/social')}`}
            aria-label="Rede Social"
            title="Rede Social"
          >
            <div className="flex items-center gap-2">
              <UsersRound className="w-4 h-4" />
              <span className="hidden sm:inline">Rede Social</span>
            </div>
          </Link>
        </nav>
      </div>
    </header>
  );
}
