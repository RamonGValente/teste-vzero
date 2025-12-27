import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { autoUpdateAfterLogin } from "@/utils/pwaUpdate";

/**
 * Sem UI: após o login, checa update do PWA e recarrega automaticamente
 * caso encontre uma nova versão do Service Worker.
 */
export function AutoPwaUpdateAfterLogin() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    autoUpdateAfterLogin();
  }, [user]);

  return null;
}
