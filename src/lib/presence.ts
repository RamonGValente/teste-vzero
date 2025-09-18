export const ONLINE_TTL_MS = 600 * 1000; // 10min de tolerância para abas em segundo plano // 70s de tolerância

export function isOnline(status?: string | null, lastSeen?: string | null): boolean {
  if (status === 'online') return true;
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_TTL_MS;
}
