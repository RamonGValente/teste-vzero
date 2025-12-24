import { useEffect, useMemo, useState } from "react";

function pad(n: number) { return String(n).padStart(2, "0"); }

export function useCountdown(expiresAt?: string | null) {
  const target = useMemo(() => (expiresAt ? new Date(expiresAt).getTime() : null), [expiresAt]);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [target]);

  const diff = target ? Math.max(0, target - now) : 0;
  const totalSec = Math.floor(diff / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;

  return { totalSec, label: `${pad(mm)}:${pad(ss)}` };
}
