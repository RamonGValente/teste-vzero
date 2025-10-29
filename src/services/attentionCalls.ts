
/**
 * Attention Call service com:
 * - RPC idempotente (30s por par sender->receiver) + cooldown global 10 min
 * - TTL 30s no servidor (pg_cron ou função agendada)
 * - Coalescência no cliente (1 notificação por remetente / 30s)
 */
import { supabase } from "@/lib/supabaseClient";

export type AttentionCallError =
  | "not_authenticated"
  | "receiver_required"
  | "cannot_alert_self"
  | "silenced_by_receiver"
  | "rate_limited_10_min"
  | "unknown";

export async function sendAttentionCall(receiverId: string, message?: string) {
  const { data, error } = await supabase.rpc("attention_call_create", {
    p_receiver_id: receiverId,
    p_message: message ?? null,
  });
  if (error) {
    const code =
      (error.message as AttentionCallError) ||
      (error.code as AttentionCallError) ||
      "unknown";
    throw new Error(code);
  }
  return data as string; // attention_calls.id
}

export function attentionErrorMessage(e: unknown) {
  const code = (e as Error)?.message as AttentionCallError;
  switch (code) {
    case "rate_limited_10_min":
      return "Você acabou de chamar atenção. Aguarde 10 minutos para enviar outro alerta.";
    case "silenced_by_receiver":
      return "Este destinatário silenciou seus alertas por enquanto.";
    case "cannot_alert_self":
      return "Você não pode enviar alerta para você mesmo.";
    case "receiver_required":
      return "Destinatário obrigatório.";
    case "not_authenticated":
      return "Faça login para enviar alertas.";
    default:
      return "Não foi possível enviar o alerta agora. Tente novamente.";
  }
}

/**
 * Carga inicial: no máximo 1 alerta por remetente, últimos 30s.
 */
export async function fetchRecentAttentionCallsDistinctBySender(receiverId: string) {
  const since = new Date(Date.now() - 30_000).toISOString();
  const { data, error } = await supabase
    .from("attention_calls")
    .select("id,sender_id,receiver_id,message,created_at")
    .eq("receiver_id", receiverId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  const distinct: any[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.sender_id)) {
      seen.add(row.sender_id);
      distinct.push(row);
    }
  }
  return distinct;
}

/**
 * Tempo real coalescido: 1 por remetente a cada 30s.
 */
export function listenAttentionCallsOnePerSender(
  receiverId: string,
  onCall: (call: {
    id: string;
    sender_id: string;
    receiver_id: string;
    message: string | null;
    created_at: string;
  }) => void
) {
  const senderWindow = new Map<string, number>();

  const channel = supabase
    .channel("attention_calls_" + receiverId + "_dedupe")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "attention_calls", filter: `receiver_id=eq.${receiverId}` },
      (payload) => {
        const row = payload.new as any;
        const now = Date.now();
        const created = new Date(row.created_at).getTime();
        if (now - created > 30_000) return;
        const last = senderWindow.get(row.sender_id) ?? 0;
        if (now - last < 30_000) return;
        senderWindow.set(row.sender_id, now);
        onCall(row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Conveniência: inicia carga inicial + realtime deduplicado.
 */
export async function startAttentionListeners(
  currentUserId: string,
  onCall: (call: {
    id: string;
    sender_id: string;
    receiver_id: string;
    message: string | null;
    created_at: string;
  }) => void
) {
  try {
    const initial = await fetchRecentAttentionCallsDistinctBySender(currentUserId);
    for (const call of initial) onCall(call);
  } catch (e) {
    console.error("Falha ao carregar alertas recentes:", attentionErrorMessage(e));
  }
  return listenAttentionCallsOnePerSender(currentUserId, onCall);
}
