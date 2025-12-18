import webpushImport from "web-push";
import { createClient } from "@supabase/supabase-js";

const webpush = webpushImport?.default ?? webpushImport;

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido" });

  try {
    const input = JSON.parse(event.body || "{}");
    const { userId } = input;

    if (!userId) return json(400, { error: "userId é obrigatório" });

    // Configuração VAPID com correção automática de prefixo
    const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || "").trim();
    const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
    let VAPID_SUBJECT = (process.env.VAPID_SUBJECT || "").trim();

    if (VAPID_SUBJECT.includes("@") && !VAPID_SUBJECT.startsWith("mailto:")) {
      VAPID_SUBJECT = `mailto:${VAPID_SUBJECT}`;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) return json(200, { sent: 0, message: "Sem inscrições" });

    const payload = JSON.stringify({
      title: input.title || "Notificação",
      body: input.body || "",
      icon: input.icon || "/icon-192.png",
      data: { url: input.url || "/" }
    });

    const results = await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } },
            payload
          );
          return { success: true };
        } catch (e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
          return { success: false };
        }
      })
    );

    return json(200, { success: true, sent: results.filter(r => r.success).length });
  } catch (err) {
    return json(500, { error: "Erro interno", details: err.message });
  }
};