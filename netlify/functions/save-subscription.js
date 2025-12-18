// netlify/functions/save-subscription.js (ESM - compatível com "type":"module")
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function safeJsonParse(str) {
  try { return str ? JSON.parse(str) : {}; } catch { return {}; }
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes" }) };
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { userId, endpoint, expiration_time, keys_p256dh, keys_auth } = safeJsonParse(event.body);

    if (!userId || !endpoint || !keys_p256dh || !keys_auth) {
      return { statusCode: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Campos obrigatórios ausentes", required: ["userId","endpoint","keys_p256dh","keys_auth"] }) };
    }

    // remove duplicados pelo endpoint+userId e reinsere (evita depender de UNIQUE no banco)
    await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);

    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: userId,
      endpoint,
      expiration_time: expiration_time ?? null,
      keys_p256dh,
      keys_auth,
    });

    if (error) {
      return { statusCode: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Erro ao salvar subscription", details: error.message }) };
    }

    return { statusCode: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Erro interno", details: e?.message || String(e) }) };
  }
};
