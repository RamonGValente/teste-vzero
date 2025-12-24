// netlify/functions/send-push.cjs
// Envia push para as subscriptions do usuário salvas na tabela public.push_subscriptions.
// CommonJS (.cjs) para evitar problemas com "type":"module" no package.json.

const webpushPkg = require("web-push");
const { createClient } = require("@supabase/supabase-js");
const webpush = webpushPkg.default ?? webpushPkg;

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

exports.handler = async (event) => {
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
    let input = {};
    try {
      input = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Body inválido (JSON)" });
    }

    const { userId } = input;
    if (!userId) return json(400, { error: "userId é obrigatório" });

    const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || "").trim();
    const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
    const VAPID_SUBJECT = (process.env.VAPID_SUBJECT || "mailto:admin@example.com").trim();

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json(500, {
        error: "Chaves VAPID não configuradas",
        details: "Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no Netlify e faça 'Clear cache and deploy'.",
      });
    }

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, {
        error: "Supabase não configurado",
        details: "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify e faça 'Clear cache and deploy'.",
      });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys_p256dh, keys_auth")
      .eq("user_id", userId);

    if (subErr) return json(500, { error: "Erro ao buscar subscriptions", details: subErr.message });
    if (!subs || subs.length === 0) return json(404, { error: "Nenhuma subscription encontrada para este usuário" });

    const payload = {
      title: input.title || "UDG",
      body: input.body || "Nova notificação",
      icon: input.icon || "/icon-192.png",
      badge: input.badge || "/icon-192.png",
      tag: input.tag || "udg-general",
      url: input.url || "/news",
      data: input.data || {},
      actions: input.actions,
      requireInteraction: Boolean(input.requireInteraction),
      silent: Boolean(input.silent),
      renotify: Boolean(input.renotify),
      vibrate: Array.isArray(input.vibrate) ? input.vibrate : undefined,
      timestamp: Date.now(),
    };

    const results = await Promise.all(
      subs.map(async (s) => {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.keys_p256dh, auth: s.keys_auth },
        };
        try {
          await webpush.sendNotification(subscription, JSON.stringify(payload));
          return { success: true, endpoint: s.endpoint };
        } catch (e) {
          const statusCode = e?.statusCode;
          const message = e?.message || String(e);
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
          return { success: false, endpoint: s.endpoint, statusCode, error: message };
        }
      })
    );

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;

    return json(200, { success: true, sent, failed, results });
  } catch (err) {
    return json(500, { error: "Erro interno do servidor", details: err?.message || String(err) });
  }
};
