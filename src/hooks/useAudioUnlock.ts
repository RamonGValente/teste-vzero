import { useEffect, useRef, useState } from 'react';

export function useAudioUnlock(onUnlock?: () => void) {
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const triedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (unlocked || triedRef.current) return;

    const handler = () => {
      triedRef.current = true;
      setUnlocked(true);
      onUnlock?.();
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };

    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [unlocked, onUnlock]);

  return unlocked;
}
