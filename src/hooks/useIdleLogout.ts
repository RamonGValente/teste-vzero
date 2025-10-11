
/**
 * useIdleLogout (NO-OP)
 * Desativa completamente o logout por inatividade.
 */
import { useEffect } from 'react';

type Options = { idleMs?: number };

export function useIdleLogout(_opts?: Options) {
  useEffect(() => {
    return () => {};
  }, []);
}

export default useIdleLogout;
