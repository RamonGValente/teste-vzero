/**
 * Notificação de "Chamar Atenção" no estilo legado.
 *
 * Ordem de tentativa (para manter compatibilidade com o seu projeto original):
 * 1) window.__appNotify?.('attention', payload)  -> NotificationProvider antigo
 * 2) dispatchEvent(new CustomEvent('attention:notify', { detail })) -> listeners antigos
 * 3) fallback: sonner toast
 */

export type AttentionPayload = {
  id?: string;
  sender_id: string;
  receiver_id: string;
  message?: string | null;
  created_at?: string; // ISO
  sender_name?: string | null;
  sender_avatar?: string | null;
};

declare global {
  interface Window {
    __appNotify?: (type: string, payload: any) => void;
  }
}

export function notifyAttention(p: AttentionPayload) {
  // 1) Notificador legado via NotificationProvider
  try {
    if (typeof window !== 'undefined' && typeof window.__appNotify === 'function') {
      window.__appNotify('attention', p);
      return;
    }
  } catch {}

  // 2) CustomEvent legado (se houver algum listener no app antigo)
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('attention:notify', { detail: p }));
      return;
    }
  } catch {}

  // 3) Fallback: sonner toast (não altera UI antiga se os caminhos acima existirem)
  try {
    // Import dinâmico para não acoplar se o projeto não usar sonner
    import('sonner').then((m) => {
      const { toast } = m as any;
      const sender = p.sender_name || (p.sender_id?.slice(0, 8)) || 'Contato';
      const when = p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      toast(`🔔 Chamar atenção — ${sender}`, {
        description: when ? `Enviado às ${when}` : undefined,
      });
    }).catch(() => {});
  } catch {}
}
