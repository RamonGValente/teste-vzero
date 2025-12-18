// netlify/functions/send-push.js
// ✅ ESM (este projeto usa "type": "module" no package.json)
// Envia push para todas as subscriptions do usuário registradas em public.push_subscriptions.

import webpushImport from "web-push";
import { createClient } from "@supabase/supabase-js";

// web-push é CommonJS; em ESM geralmente chega como default
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
  // Trata pre-flight requests (CORS)
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

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Método não permitido" });
  }

  try {
    let input = {};
    try {
      input = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Body inválido (JSON)" });
    }

    const { userId } = input;
    if (!userId) return json(400, { error: "userId é obrigatório" });

    // ===== ENV (Netlify) =====
    const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || "").trim();
    const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
    let VAPID_SUBJECT = (process.env.VAPID_SUBJECT || "").trim();

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    // 🛑 CORREÇÃO DO ERRO 500 (VAPID SUBJECT)
    // Se o subject for um email e não começar com "mailto:", adicionamos automaticamente
    if (!VAPID_SUBJECT) {
        VAPID_SUBJECT = "mailto:admin@example.com";
    } else if (VAPID_SUBJECT.includes("@") && !VAPID_SUBJECT.startsWith("mailto:") && !VAPID_SUBJECT.startsWith("http")) {
        VAPID_SUBJECT = `mailto:${VAPID_SUBJECT}`;
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json(500, {
        error: "Chaves VAPID não configuradas",
        details: "Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas Environment Variables do Netlify.",
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, {
        error: "Supabase não configurado",
        details: "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas Environment Variables do Netlify.",
      });
    }

    try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    } catch (configErr) {
        return json(500, { error: "Erro na configuração VAPID", details: configErr.message });
    }

    // Usa Service Role para ignorar RLS na leitura e deleção de subs
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys_p256dh, keys_auth")
      .eq("user_id", userId);

    if (subErr) {
      return json(500, { error: "Erro ao buscar subscriptions", details: subErr.message });
    }

    if (!subs || subs.length === 0) {
      return json(200, { success: false, message: "Nenhuma subscription encontrada para este usuário", sent: 0 });
    }

    const payload = {
      title: input.title || "UDG",
      body: input.body || "Nova notificação",
      icon: input.icon || "/icon-192.png",
      badge: input.badge || "/badge-72.png",
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

    const payloadString = JSON.stringify(payload);

    const results = await Promise.all(
      subs.map(async (s) => {
        const subscription = {
          endpoint: s.endpoint,
          keys: {
            p256dh: s.keys_p256dh,
            auth: s.keys_auth,
          },
        };

        try {
          await webpush.sendNotification(subscription, payloadString);
          return { success: true, endpoint: s.endpoint };
        } catch (e) {
          const statusCode = e?.statusCode;
          const message = e?.message || String(e);

          // 404/410 = subscription morta/revogada -> remove do banco
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