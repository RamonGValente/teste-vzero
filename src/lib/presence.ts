export const HEARTBEAT_MS = 20_000;  // send heartbeat every 20s
export const ONLINE_TTL_MS = 70_000; // consider online if heartbeat within last 70s
export const PRESENCE_DEBUG = false;

/** Returns true if user should be considered online based on status/last_seen. */
export function isOnline(status?: string | null, lastSeen?: string | null): boolean {
  if (status === 'online') return true;
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_TTL_MS;
}
