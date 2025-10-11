import { supabase } from '@/lib/supabase';
import { updateSelfStatus } from '@/lib/database';
import { HEARTBEAT_MS } from '@/lib/presence';

class OnlineStatusService {
  private hb: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private beforeUnload?: () => void;
  private visibilityHandler?: () => void;
  private channel: ReturnType<typeof supabase.channel> | null = null;

  start() {
    if (this.started) return;
    this.started = true;

    // Keep a realtime subscription open. Also allows UI to receive changes.
    this.channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (_payload) => {
        // UI layer should react via its store to payload.new to re-render presence badges
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.bumpOnline().catch(() => {});
        }
      });

    // Heartbeat every 30s while the app is open.
    this.hb = setInterval(() => {
      this.bumpOnline().catch(() => {});
    }, HEARTBEAT_MS);

    // When the tab becomes visible again, immediately bump.
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.bumpOnline().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // On tab close, set offline best-effort (sendBeacon).
    this.beforeUnload = () => {
      try {
        const url = `${supabase.restUrl}/rpc/update_self_status`;
        const body = JSON.stringify({ new_status: 'offline' });
        // @ts-ignore
        navigator.sendBeacon(url, body);
      } catch {
        // ignore
      }
    };
    window.addEventListener('pagehide', this.beforeUnload);
    window.addEventListener('beforeunload', this.beforeUnload);

    // Initial bump.
    this.bumpOnline().catch(() => {});
  }

  async bumpOnline() {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return; // not logged in
    await updateSelfStatus('online');
  }

  async forceOffline() {
    try {
      await updateSelfStatus('offline');
    } catch {}
  }

  async stop() {
    if (this.hb) clearInterval(this.hb);
    this.hb = null;

    if (this.beforeUnload) {
      window.removeEventListener('pagehide', this.beforeUnload);
      window.removeEventListener('beforeunload', this.beforeUnload);
      this.beforeUnload = undefined;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.started = false;
  }
}

export const onlineStatusService = new OnlineStatusService();
