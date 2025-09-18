import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Mantém o usuário ONLINE enquanto o app/aba existir (mesmo em segundo plano).
 * Só marca OFFLINE ao fechar o PWA/aba/navegador (beforeunload) ou desmontar o app.
 * Mantém heartbeat periódico para atualizar last_seen.
 * Usa RPC public.set_presence(p_online boolean).
 */
export function useOnlineStatus() {
  const heartbeat = useRef<number | null>(null);

  useEffect(() => {
    const setPresence = async (online: boolean) => {
      try {
        await supabase.rpc('set_presence', { p_online: online });
      } catch (e) {
        // best-effort
        console.warn('set_presence failed', e);
      }
    };

    const goOnline = () => {
      setPresence(true);
      if (heartbeat.current) window.clearInterval(heartbeat.current);
      // Mantém last_seen atualizado. 30s costuma ser OK com throttling de background.
      heartbeat.current = window.setInterval(() => setPresence(true), 30_000) as any;
    };

    const goOffline = () => {
      if (heartbeat.current) {
        window.clearInterval(heartbeat.current);
        heartbeat.current = null;
      }
      setPresence(false);
    };

    // Inicializa como ONLINE ao montar
    goOnline();

    // Ao fechar a aba/PWA/navegador, tenta registrar OFFLINE
    const handleBeforeUnload = () => {
      // melhor esforço; alguns navegadores podem ignorar requisições async aqui
      goOffline();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Ao desmontar o app (logout/navegação fora do app), marca OFFLINE
      goOffline();
    };
  }, []);
}
