// netlify/functions/send-push.cjs  (CommonJS - mais compatível no Netlify)
const webpushPkg = require("web-push");
const { createClient } = require("@supabase/supabase-js");

// web-push pode vir como default dependendo do bundler
const webpush = webpushPkg.default ?? webpushPkg;

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Método não permitido" });
  }

  try {
    const payloadIn = JSON.parse(event.body || "{}");
    const { userId, title, body, icon, badge, url, tag, data, actions } = payloadIn || {};

    if (!userId) return jsonResponse(400, { error: "userId é obrigatório" });

    // ===== VAPID (Netlify env vars) =====
    const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
    const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
    const vapidSubject = (process.env.VAPID_SUBJECT || "mailto:admin@example.com").trim();

    if (!vapidPublicKey || !vapidPrivateKey) {
      return jsonResponse(500, {
        error: "Chaves VAPID não configuradas",
        details: "Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas Environment Variables do Netlify e faça redeploy.",
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // ===== Supabase (service role) =====
    const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse(500, {
        error: "Supabase não configurado",
        details: "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify e faça redeploy.",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys_p256dh, keys_auth")
      .eq("user_id", userId);

    if (subErr) {
      return jsonResponse(500, { error: "Erro ao buscar subscriptions", details: subErr.message });
    }

    if (!subs || subs.length === 0) {
      return jsonResponse(404, { error: "Nenhuma subscription encontrada para este usuário" });
    }

    const pushPayload = {
      title: title || "UDG",
      body: body || "Nova notificação",
      icon: icon || "/icon-192.png",
      badge: badge || "/icon-192.png",
      tag: tag || "udg-general",
      url: url || "/news",
      data: data || {},
      actions,
      timestamp: Date.now(),
    };

    const results = await Promise.all(
      subs.map(async (s) => {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.keys_p256dh, auth: s.keys_auth },
        };

        try {
          await webpush.sendNotification(subscription, JSON.stringify(pushPayload));
          return { success: true, endpoint: s.endpoint };
        } catch (e) {
          const statusCode = e?.statusCode;
          // 404/410 = subscription morta -> apaga
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
          return { success: false, endpoint: s.endpoint, statusCode, error: e?.message || String(e) };
        }
      })
    );

    const sent = results.filter((r) => r.success).length;
    return jsonResponse(200, { success: true, sent, failed: results.length - sent, results });
  } catch (err) {
    return jsonResponse(500, {
      error: "Erro interno do servidor",
      details: err?.message || String(err),
    });
  }
};
