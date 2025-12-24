import { useEffect, useRef } from "react";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Listener global de update do PWA.
 * - Registra o SW manualmente
 * - Mostra o botão "Atualizar" quando uma nova versão (deploy) estiver disponível
 * - Pensado para ser montado APÓS login (para não atrapalhar o fluxo inicial)
 */

// Mantém registro único, mesmo se o componente for montado mais de uma vez.
let _registered = false;
let _updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function PwaUpdateListener() {
  const { toast } = useToast();
  const { user } = useAuth();
  const toastRef = useRef(toast);
  const userRef = useRef(user);
  const shownRef = useRef(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const showUpdateToast = () => {
    if (shownRef.current) return;
    shownRef.current = true;
    toastRef.current({
      title: "🔄 Nova versão disponível!",
      description: "Toque em Atualizar para usar a versão mais recente.",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void _updateSW?.(true);
          }}
          className="ml-2"
        >
          Atualizar
        </Button>
      ),
    });
  };

  useEffect(() => {
    if (_registered) return;
    _registered = true;

    // Registra SW e recebe callbacks de atualização
    _updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Se ainda não tem usuário logado, armazenamos e exibimos após login.
        if (!userRef.current) {
          pendingRef.current = true;
          return;
        }
        showUpdateToast();
      },
    });

    // Força checagem periódica (útil em PWAs que ficam abertos por muito tempo)
    const interval = window.setInterval(() => {
      try {
        void _updateSW?.();
      } catch {
        // ignore
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => window.clearInterval(interval);
  }, []);

  // Se o SW detectou update ANTES do login, mostramos assim que o usuário logar.
  useEffect(() => {
    if (!user) return;

    // Após login, força uma checagem imediata de update.
    // (ajuda em PWAs que ficam dias abertos sem recarregar)
    try {
      void _updateSW?.();
    } catch {
      // ignore
    }

    if (!pendingRef.current) return;
    pendingRef.current = false;
    showUpdateToast();
  }, [toast, user]);

  return null;
}
