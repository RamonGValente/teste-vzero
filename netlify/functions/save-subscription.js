// netlify/functions/save-subscription.js
// ✅ ESM (projeto usa "type": "module")
// Salva/atualiza uma PushSubscription no Supabase.

import { createClient } from "@supabase/supabase-js";

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

    const userId = input.userId || input.user_id;
    const sub = input.subscription || input;

    if (!userId) return json(400, { error: "userId é obrigatório" });
    if (!sub?.endpoint) return json(400, { error: "subscription.endpoint é obrigatório" });

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, {
        error: "Supabase não configurado",
        details: "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify e faça redeploy.",
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = {
      user_id: userId,
      endpoint: sub.endpoint,
      expiration_time: sub.expirationTime ? new Date(sub.expirationTime).toISOString() : null,
      keys_p256dh: sub.keys?.p256dh || null,
      keys_auth: sub.keys?.auth || null,
    };

    // Procura uma linha existente para (user_id, endpoint)
    const { data: existing, error: findErr } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("endpoint", sub.endpoint)
      .maybeSingle();

    if (findErr) {
      return json(500, { error: "Erro ao consultar subscription", details: findErr.message });
    }

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from("push_subscriptions")
        .update(payload)
        .eq("id", existing.id);

      if (updErr) {
        return json(500, { error: "Erro ao atualizar subscription", details: updErr.message });
      }

      return json(200, { success: true, action: "updated" });
    }

    const { error: insErr } = await supabase.from("push_subscriptions").insert(payload);
    if (insErr) {
      return json(500, { error: "Erro ao inserir subscription", details: insErr.message });
    }

    return json(200, { success: true, action: "inserted" });
  } catch (err) {
    return json(500, { error: "Erro interno do servidor", details: err?.message || String(err) });
  }
};
