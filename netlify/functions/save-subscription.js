import { corsHeaders, createAdminClient, requireUser } from './_shared.js';

export const handler = async (event) => {
  const headers = corsHeaders('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { payload = null; }
  if (!payload?.subscription?.endpoint) return { statusCode: 400, headers, body: JSON.stringify({ error: 'subscription inválida' }) };

  try {
    const supabaseAdmin = createAdminClient();
    const auth = await requireUser(event, supabaseAdmin);
    if (!auth.ok) return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };

    const userId = auth.user.id;
    const subscription = payload.subscription;

    const keys = subscription.keys || {};
    const row = {
      user_id: userId,
      endpoint: subscription.endpoint,
      expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
      keys_p256dh: keys.p256dh || null,
      keys_auth: keys.auth || null,
    };

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });

    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? e.message : String(e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: msg }) };
  }
};
