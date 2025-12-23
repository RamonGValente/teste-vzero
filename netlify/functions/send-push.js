import { corsHeaders, createAdminClient, requireUser } from './_shared.js';

function getBaseUrl(event) {
  const origin =
    event?.headers?.origin ||
    (event?.headers?.referer ? new URL(event.headers.referer).origin : null);

  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.SITE_URL ||
    origin ||
    'http://localhost:3000'
  );
}

function safePreview(text, max = 80) {
  if (!text) return '';
  const t = String(text).trim().replace(/\s+/g, ' ');
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

async function sendOneSignalNotification({ appId, restApiKey, targetExternalIds, title, message, url, data }) {
  if (!targetExternalIds?.length) return { ok: true, skipped: true };

  const payload = {
    app_id: appId,
    headings: { pt: title, en: title },
    contents: { pt: message, en: message },
    url,
    data,
    include_aliases: { external_id: targetExternalIds },
  };

  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${restApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`OneSignal error (${res.status}): ${JSON.stringify(json)}`);
    err.details = json;
    throw err;
  }

  return { ok: true, response: json };
}

export async function handler(event) {
  const headers = corsHeaders('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseAdmin = createAdminClient();
  const auth = await requireUser(event, supabaseAdmin);
  if (!auth.ok) {
    return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body || { error: 'Unauthorized' }) };
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Missing OneSignal env vars: ONESIGNAL_APP_ID and/or ONESIGNAL_REST_API_KEY',
      }),
    };
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { eventType } = payload;
  const baseUrl = getBaseUrl(event);

  try {
    let receiverIds = [];
    let title = 'Notificação';
    let message = '';
    let url = `${baseUrl}/news`;
    let data = { eventType };

    if (eventType === 'test') {
      receiverIds = [auth.user.id];
      title = 'Teste de Push';
      message = 'Se você recebeu isso, o OneSignal está funcionando ✅';
      url = `${baseUrl}/news`;
      data = { eventType: 'test' };
    }

    if (eventType === 'message') {
      const { messageId } = payload;
      if (!messageId) throw new Error('Missing messageId');

      const { data: msg, error: msgErr } = await supabaseAdmin
        .from('messages')
        .select('id, conversation_id, user_id, content, created_at')
        .eq('id', messageId)
        .maybeSingle();
      if (msgErr) throw msgErr;
      if (!msg) throw new Error('Message not found');

      const { data: participants, error: pErr } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', msg.conversation_id);
      if (pErr) throw pErr;

      receiverIds = (participants || []).map((p) => p.user_id).filter((id) => id && id !== msg.user_id);
      title = 'Nova mensagem';
      message = safePreview(msg.content || 'Você recebeu uma nova mensagem');
      url = `${baseUrl}/messages?conversation=${encodeURIComponent(msg.conversation_id)}`;
      data = {
        eventType: 'message',
        conversationId: msg.conversation_id,
        messageId: msg.id,
        senderId: msg.user_id,
        url,
      };
    }

    if (eventType === 'friend_request') {
      const { friendRequestId } = payload;
      if (!friendRequestId) throw new Error('Missing friendRequestId');

      const { data: fr, error: frErr } = await supabaseAdmin
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at')
        .eq('id', friendRequestId)
        .maybeSingle();
      if (frErr) throw frErr;
      if (!fr) throw new Error('Friend request not found');

      receiverIds = fr.receiver_id ? [fr.receiver_id] : [];
      title = 'Pedido de amizade';
      message = 'Você recebeu um novo pedido de amizade.';
      url = `${baseUrl}/news`;
      data = { eventType: 'friend_request', friendRequestId: fr.id, senderId: fr.sender_id, url };
    }

    if (eventType === 'mention') {
      const { mentionId } = payload;
      if (!mentionId) throw new Error('Missing mentionId');

      const { data: mention, error: mErr } = await supabaseAdmin
        .from('mentions')
        .select('id, user_id, mentioned_user_id, content_type, content_id, created_at')
        .eq('id', mentionId)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!mention) throw new Error('Mention not found');

      receiverIds = mention.mentioned_user_id ? [mention.mentioned_user_id] : [];
      title = 'Você foi mencionado';
      message = 'Alguém mencionou você em um conteúdo.';
      url = `${baseUrl}/news`;
      data = {
        eventType: 'mention',
        mentionId: mention.id,
        contentType: mention.content_type,
        contentId: mention.content_id,
        url,
      };
    }

    if (eventType === 'attention_call') {
      const { attentionCallId } = payload;
      if (!attentionCallId) throw new Error('Missing attentionCallId');

      const { data: call, error: cErr } = await supabaseAdmin
        .from('attention_calls')
        .select('id, sender_id, receiver_id, message, created_at')
        .eq('id', attentionCallId)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!call) throw new Error('Attention call not found');

      receiverIds = call.receiver_id ? [call.receiver_id] : [];
      title = 'Chamar atenção';
      message = safePreview(call.message || 'Alguém está chamando sua atenção.');
      url = `${baseUrl}/messages`;
      data = { eventType: 'attention_call', attentionCallId: call.id, senderId: call.sender_id, url };
    }

    // Filter by user preferences (best-effort; default allow)
    if (receiverIds.length) {
      const { data: prefs, error: prefErr } = await supabaseAdmin
        .from('notification_preferences')
        .select('user_id, push_enabled, messages, mentions, attention_calls, friend_requests')
        .in('user_id', receiverIds);

      if (!prefErr && prefs?.length) {
        const byId = new Map(prefs.map((p) => [p.user_id, p]));
        receiverIds = receiverIds.filter((id) => {
          const p = byId.get(id);
          if (!p) return true;
          if (p.push_enabled === false) return false;

          switch (eventType) {
            case 'message':
              return p.messages !== false;
            case 'mention':
              return p.mentions !== false;
            case 'attention_call':
              return p.attention_calls !== false;
            case 'friend_request':
              return p.friend_requests !== false;
            case 'test':
              return true;
            default:
              return true;
          }
        });
      }
    }

    const result = await sendOneSignalNotification({
      appId: ONESIGNAL_APP_ID,
      restApiKey: ONESIGNAL_REST_API_KEY,
      targetExternalIds: receiverIds,
      title,
      message,
      url,
      data,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, receiverIds, result }),
    };
  } catch (e) {
    console.error('send-push error', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e?.message || 'Unknown error', details: e?.details }),
    };
  }
}