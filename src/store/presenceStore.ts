// Zustand-like simple store w/out dependency
import { supabase } from '@/integrations/supabase/client';
import { HEARTBEAT_MS, PRESENCE_DEBUG } from '@/lib/presence';

export type PresenceRow = { id: string; status: string | null; last_seen: string | null; full_name?: string|null; avatar_url?: string|null };

type Listener = () => void;

class PresenceStore {
  private map: Record<string, PresenceRow> = {};
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private unsub: (() => void) | null = null;
  private startedForUserId: string | null = null;

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  getState() { return this.map; }
  private emit() { this.listeners.forEach(fn => { try { fn(); } catch {} }); }

  async startForCurrentUser() {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;
    if (this.startedForUserId === userId) return;
    this.startedForUserId = userId;

    // load contacts of current user
    const ids = await this.fetchContactIds(userId);
    await this.loadPresence(ids);
    this.subscribeRealtime(ids);
    this.startPolling(ids);
  }

  private async fetchContactIds(userId: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('contact_id')
      .eq('user_id', userId);
    if (error) { if (PRESENCE_DEBUG) console.warn('[presenceStore] contacts error', error); return []; }
    const ids = (data ?? []).map((r: any) => String(r.contact_id));
    if (PRESENCE_DEBUG) console.log('[presenceStore] contactIds', ids);
    return ids;
  }

  private async loadPresence(ids: string[]) {
    if (!ids.length) { this.map = {}; this.emit(); return; }
    const { data, error } = await supabase
      .from('profiles')
      .select('id,status,last_seen,full_name,avatar_url')
      .in('id', ids);
    if (error) { if (PRESENCE_DEBUG) console.warn('[presenceStore] loadPresence error', error); return; }
    const next: Record<string, PresenceRow> = {};
    (data ?? []).forEach((r: any) => {
      const id = String(r.id);
      next[id] = { id, status: r.status, last_seen: r.last_seen, full_name: r.full_name, avatar_url: r.avatar_url };
    });
    this.map = next;
    this.emit();
  }

  private subscribeRealtime(ids: string[]) {
    if (this.unsub) { try { this.unsub(); } catch {} this.unsub = null; }
    if (!ids.length) return;
    const quoted = ids.map((id) => `"${id}"`).join(',');
    const filter = `id=in.(${quoted})`;
    const ch = supabase
      .channel('profiles-presence-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter }, (payload) => {
        const row = (payload.new ?? payload.old) as any;
        if (!row?.id) return;
        const id = String(row.id);
        if (PRESENCE_DEBUG) console.log('[presenceStore:rt]', payload.eventType, id, row.status, row.last_seen);
        this.map[id] = {
          id,
          status: row.status ?? 'offline',
          last_seen: row.last_seen ?? null,
          full_name: this.map[id]?.full_name ?? row.full_name ?? null,
          avatar_url: this.map[id]?.avatar_url ?? row.avatar_url ?? null,
        };
        this.emit();
      })
      .subscribe((status) => { if (PRESENCE_DEBUG) console.log('[presenceStore:rt:status]', status); });
    this.unsub = () => { try { supabase.removeChannel(ch); } catch {} };
  }

  private startPolling(ids: string[]) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.timer = setInterval(() => this.loadPresence(ids), HEARTBEAT_MS);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.unsub) { try { this.unsub(); } catch {} this.unsub = null; }
    this.startedForUserId = null;
  }
}

export const presenceStore = new PresenceStore();

// React helpers
import { useEffect, useSyncExternalStore } from 'react';

export function useSidebarPresenceMap() {
  useEffect(() => {
    presenceStore.startForCurrentUser();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) presenceStore.startForCurrentUser(); else presenceStore.stop();
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);
  return useSyncExternalStore(
    (cb) => presenceStore.subscribe(cb),
    () => presenceStore.getState(),
    () => ({})
  );
}
