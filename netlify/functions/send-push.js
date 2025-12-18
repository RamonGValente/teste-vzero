// netlify/functions/send-push.js (ESM - compatível com "type":"module")
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function safeJsonParse(str) {
  try {
    return str ? JSON.parse(str) : {};
  } catch {
    return {};
  }
}

function missingEnv(...names) {
  return names.filter((n) => !process.env[n] || String(process.env[n]).trim() === "");
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    const { userId, title, body, icon, badge, url, tag, data, soundUrl } = safeJsonParse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "userId é obrigatório" }),
      };
    }

    const vapidPublicKey =
      process.env.VAPID_PUBLIC_KEY ||
      process.env.VITE_VAPID_PUBLIC_KEY; // fallback (ok para pública)

    // NÃO aceitar private key em VITE_ (isso vazaria para o client!)
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    // web-push exige um "subject" que seja uma URL (https://...) OU um mailto:...
    // É comum configurar só o e-mail (ex.: sistemasrtr@gmail.com), o que quebra com:
    // "Vapid subject is not a valid URL".
    // Aqui normalizamos para evitar erro 500.
    const rawSubject = (process.env.VAPID_SUBJECT || "mailto:admin@sistemaapp.netlify.app").trim();
    const vapidSubject = (() => {
      const s = rawSubject;
      // já está no formato correto
      if (/^(mailto:|https?:\/\/)/i.test(s)) return s;
      // parece ser e-mail puro
      if (s.includes("@") && !s.includes(":")) return `mailto:${s}`;
      // fallback seguro
      return "mailto:admin@sistemaapp.netlify.app";
    })();

    if (!vapidPublicKey || !vapidPrivateKey) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Chaves VAPID não configuradas",
          details: {
            hasPublic: !!vapidPublicKey,
            hasPrivate: !!vapidPrivateKey,
            hint:
              "Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas variáveis do Netlify (Site settings > Environment variables).",
          },
        }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const miss = missingEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
    if (miss.length) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Variáveis do Supabase ausentes no servidor",
          missing: miss,
          hint: "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify.",
        }),
      };
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, expiration_time, keys_p256dh, keys_auth")
      .eq("user_id", userId);

    if (subsError) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Erro ao buscar subscriptions", details: subsError.message }),
      };
    }

    if (!subs || subs.length === 0) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Usuário sem inscrições de push (push_subscriptions vazio)" }),
      };
    }

    const payload = JSON.stringify({
      title: title || "Nova notificação",
      body: body || "",
      icon: icon || "/icon-192.png",
      badge: badge || "/icons/icon-72.png",
      tag: tag || "push",
      url: url || "/news",
      soundUrl: soundUrl || "/sounds/push.mp3",
      data: data || {},
    });

    let sent = 0;
    let failed = 0;
    const results = [];

    // dedupe por endpoint (caso existam duplicados no banco)
    const uniqueSubs = new Map();
    for (const s of subs) uniqueSubs.set(s.endpoint, s);
    const list = Array.from(uniqueSubs.values());

    for (const s of list) {
      const subscription = {
        endpoint: s.endpoint,
        expirationTime: s.expiration_time ? new Date(s.expiration_time).getTime() : null,
        keys: { p256dh: s.keys_p256dh, auth: s.keys_auth },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
        results.push({ endpoint: s.endpoint, success: true });
      } catch (err) {
        failed += 1;

        const statusCode = err?.statusCode || err?.status;
        const message = err?.message || String(err);

        // 410/404: inscrição inválida => remover
        if (statusCode === 404 || statusCode === 410) {
          try {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          } catch {}
        }

        results.push({ endpoint: s.endpoint, success: false, statusCode, message });
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, sent, failed, results }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Erro interno do servidor", details: error?.message || String(error) }),
    };
  }
};
