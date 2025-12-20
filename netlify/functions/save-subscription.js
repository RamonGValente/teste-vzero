import { corsHeaders, createAdminClient, requireUser } from './_shared.js';

/**
 * Saves a Web Push subscription for the authenticated user.
 *
 * NOTE:
 * - Supabase upsert with `onConflict: 'endpoint'` requires a UNIQUE constraint on `push_subscriptions.endpoint`.
 * - Many projects forget this constraint, which causes a 500 error when subscribing.
 *
 * To be resilient, we do a safe "update-then-insert" flow that works even without the UNIQUE constraint.
 */
export const handler = async (event) => {
  const headers = corsHeaders('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    payload = null;
  }

  if (!payload?.subscription?.endpoint) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'subscription inválida' }) };
  }

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

    // 1) Try UPDATE by endpoint (works even if endpoint isn't unique)
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('push_subscriptions')
      .update(row)
      .eq('endpoint', row.endpoint)
      .select('id');

    if (updateErr) {
      // If update fails for any reason, bail out with details.
      return { statusCode: 500, headers, body: JSON.stringify({ error: updateErr.message }) };
    }

    // 2) If nothing updated, INSERT
    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('push_subscriptions')
        .insert(row);

      if (insertErr) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: insertErr.message }) };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? e.message : String(e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: msg }) };
  }
};
