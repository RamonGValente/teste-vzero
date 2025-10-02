import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { callId, roomId } = await req.json();
    if (!callId || !roomId) {
      return new Response(JSON.stringify({ error: "callId e roomId obrigatórios" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;
    const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: user.id, ttl: "10m" });
    at.addGrant({ room: roomId, roomJoin: true, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();

    await supabase.from("webrtc_tokens").insert({ call_id: callId, user_id: user.id, token, expires_at: new Date(Date.now() + 9 * 60 * 1000).toISOString() });

    return new Response(JSON.stringify({ token, livekitUrl: LIVEKIT_URL }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
