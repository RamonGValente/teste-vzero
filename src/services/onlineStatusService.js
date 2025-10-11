import { supabase } from '../lib/supabaseClient';

class OnlineStatusService {
  constructor() {
    this.isAppActive = true;
    this.heartbeatInterval = null;
    this.visibilityHandler = null;
    this.offlineTimeout = null;
    this.init();
  }

  init() {
    this.setupVisibilityListener();
    this.setupHeartbeat();
    this.setOnline(); // Inicia como online
  }

  setupVisibilityListener() {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // App ficou visível - volta para online
        this.setOnline();
      } else {
        // App ficou oculto - agenda para ficar offline após 30 segundos
        this.scheduleOffline();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Monitora antes de fechar a página/aba
    window.addEventListener('beforeunload', () => {
      this.setOfflineImmediately();
    });
  }

  setupHeartbeat() {
    // Envia heartbeat a cada 20 segundos quando online
    this.heartbeatInterval = setInterval(() => {
      if (this.isAppActive) {
        this.sendHeartbeat();
      }
    }, 20000);
  }

  scheduleOffline() {
    // Cancela timeout anterior se existir
    if (this.offlineTimeout) {
      clearTimeout(this.offlineTimeout);
    }

    // Agenda para ficar offline após 30 segundos em segundo plano
    this.offlineTimeout = setTimeout(() => {
      if (document.visibilityState === 'hidden') {
        this.setOfflineImmediately();
      }
    }, 30000);
  }

  async setOnline() {
    // Cancela qualquer agendamento de offline
    if (this.offlineTimeout) {
      clearTimeout(this.offlineTimeout);
      this.offlineTimeout = null;
    }

    this.isAppActive = true;
    await this.updateOnlineStatus('online');
  }

  async setOfflineImmediately() {
    this.isAppActive = false;
    await this.updateOnlineStatus('offline');
  }

  async sendHeartbeat() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        status: 'online',
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Erro no heartbeat:', error);
      }
    } catch (error) {
      console.error('Erro no heartbeat:', error);
    }
  }

  async updateOnlineStatus(status = 'online') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        status: status,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
      } else {
        console.log(`Status atualizado para: ${status}`);
      }
    } catch (error) {
      console.error('Erro no serviço de status:', error);
    }
  }

  // Para ser chamado quando o usuário fizer logout
  async forceOffline() {
    await this.setOfflineImmediately();
    this.cleanup();
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.offlineTimeout) {
      clearTimeout(this.offlineTimeout);
      this.offlineTimeout = null;
    }
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      window.removeEventListener('beforeunload', this.setOfflineImmediately);
      this.visibilityHandler = null;
    }
  }
}

// Instância única do serviço
export const onlineStatusService = new OnlineStatusService();