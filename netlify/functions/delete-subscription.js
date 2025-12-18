import { corsHeaders, createAdminClient, requireUser } from './_shared.js';

export const handler = async (event) => {
  const headers = corsHeaders('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { payload = null; }
  const endpoint = payload?.endpoint;
  if (!endpoint) return { statusCode: 400, headers, body: JSON.stringify({ error: 'endpoint ausente' }) };

  try {
    const supabaseAdmin = createAdminClient();
    const auth = await requireUser(event, supabaseAdmin);
    if (!auth.ok) return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };

    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: str(e) }) };
  }
};
