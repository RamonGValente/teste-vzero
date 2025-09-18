import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

const IDLE_TIME = 10 * 60 * 1000; // 10 minutos em ms
const WARNING_TIME = 9 * 60 * 1000; // 9 minutos - aviso 1 minuto antes

export const useIdleLogout = () => {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef(false);

  const resetTimer = useCallback(() => {
    // Limpar timers existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    
    // Reset warning flag
    warningShownRef.current = false;

    // Só configurar timer se o usuário estiver logado
    if (!user) return;

    // Timer de aviso (9 minutos)
    warningTimeoutRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning('Você será desconectado em 1 minuto por inatividade', {
          duration: 10000,
          action: {
            label: 'Continuar',
            onClick: () => {
              resetTimer();
              toast.success('Sessão renovada!');
            }
          }
        });
      }
    }, WARNING_TIME);

    // Timer de logout (10 minutos)
    timeoutRef.current = setTimeout(() => {
      toast.error('Sessão expirada por inatividade');
      signOut();
    }, IDLE_TIME);
  }, [user, signOut]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!user) return;

    // Eventos que indicam atividade do usuário
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar o timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, handleActivity, resetTimer]);

  return { resetTimer };
};