import { createAdminClient, corsHeaders } from './_shared.js';

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

function uniqStrings(values) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(values) ? values : []) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function getHeader(event, name) {
  const key = Object.keys(event.headers || {}).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? event.headers[key] : null;
}

function verifyWebhookSecret(event) {
  const secret = process.env.SUPABASE_DB_WEBHOOK_SECRET;
  if (!secret) return { ok: true, reason: 'no-secret-configured' };

  // Supabase Dashboard lets you add custom headers to each webhook.
  // We'll accept either of these header names.
  const provided =
    getHeader(event, 'X-Webhook-Secret') ||
    getHeader(event, 'X-Supabase-Event-Signature') ||
    getHeader(event, 'X-Supabase-Webhook-Secret');

  if (!provided) return { ok: false, reason: 'missing-secret-header' };
  if (provided !== secret) return { ok: false, reason: 'invalid-secret-header' };

  return { ok: true, reason: 'verified' };
}

async function sendOneSignalNotification({
  appId,
  restApiKey,
  targetExternalIds,
  title,
  message,
  url,
  data,
  appIconUrl,
  imageUrl,
}) {
  const externalIds = uniqStrings(targetExternalIds);
  if (!externalIds.length) return { ok: true, skipped: true };

  const payload = {
    app_id: appId,
    target_channel: 'push',
    headings: { pt: title, en: title },
    contents: { pt: message, en: message },
    url,
    data,
    include_aliases: { external_id: externalIds },
    // Visual (logo do app + foto do autor quando possível)
    chrome_web_icon: appIconUrl,
    chrome_web_badge: appIconUrl,
    firefox_icon: appIconUrl,
    small_icon: appIconUrl,
    large_icon: appIconUrl,
    ...(imageUrl ? { chrome_web_image: imageUrl, large_icon: imageUrl, ios_attachments: { id: imageUrl } } : {}),
  };

  const res = await fetch('https://api.onesignal.com/notifications?c=push', {
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

  // OneSignal pode retornar 200 com `errors` (ex.: invalid_aliases). Nunca faça fallback.
  if (json && json.errors) {
    const err = new Error(`OneSignal API returned errors: ${JSON.stringify(json.errors)}`);
    err.details = json;
    throw err;
  }

  return { ok: true, response: json };
}

async function filterByPreferences(supabaseAdmin, receiverIds, eventType) {
  if (!receiverIds?.length) return receiverIds;
  try {
    const { data: prefs, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, push_enabled, messages, mentions, attention_calls, friend_requests, comments, posts')
      .in('user_id', receiverIds);

    if (error || !prefs?.length) return receiverIds;

    const byId = new Map(prefs.map((p) => [p.user_id, p]));
    return receiverIds.filter((id) => {
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
        case 'comment':
          return p.comments !== false;
        case 'post':
          return p.posts !== false;
        default:
          return true;
      }
    });
  } catch {
    // If the preferences table doesn't exist yet, do best-effort and keep sending.
    return receiverIds;
  }
}

export async function handler(event) {
  const headers = corsHeaders('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const check = verifyWebhookSecret(event);
  if (!check.ok) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ ok: false, error: 'Unauthorized webhook', reason: check.reason }),
    };
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Missing OneSignal env vars: ONESIGNAL_APP_ID and/or ONESIGNAL_REST_API_KEY',
      }),
    };
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const { type, table, schema, record } = payload || {};
  if (schema && schema !== 'public') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'non-public-schema' }) };
  }

  // We only need INSERT events for push.
  if (type !== 'INSERT') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'not-insert' }) };
  }

  const supabaseAdmin = createAdminClient();
  const baseUrl = getBaseUrl(event);
	const appIconUrl = `${baseUrl}/icons/icon-192.png`;

  try {
    let receiverIds = [];
    let eventType = null;
    let title = 'Notificação';
    let message = '';
    let url = `${baseUrl}/news`;
    let data = {};
	    let imageUrl = null;

    if (table === 'messages') {
      eventType = 'message';
      const msg = record;
      if (!msg?.id || !msg?.conversation_id || !msg?.user_id) {
        throw new Error('Webhook payload missing message fields');
      }

	      // Se for conversa direta, restringe para os 2 primeiros participantes (protege privacidade).
	      let isGroup = true;
	      try {
	        const { data: conv } = await supabaseAdmin
	          .from('conversations')
	          .select('is_group, max_participants')
	          .eq('id', msg.conversation_id)
	          .maybeSingle();
	        if (conv && conv.is_group === false && (conv.max_participants ?? 2) <= 2) isGroup = false;
	      } catch {}

	      const { data: participants, error: pErr } = await supabaseAdmin
	        .from('conversation_participants')
	        .select('user_id, joined_at')
	        .eq('conversation_id', msg.conversation_id)
	        .order('joined_at', { ascending: true });
	      if (pErr) throw pErr;

	      if (!isGroup) {
	        const firstTwo = [];
	        const seen = new Set();
	        for (const p of participants || []) {
	          if (p?.user_id && !seen.has(p.user_id)) {
	            seen.add(p.user_id);
	            firstTwo.push(p.user_id);
	            if (firstTwo.length >= 2) break;
	          }
	        }
	        receiverIds = firstTwo.filter((id) => id && id !== msg.user_id);
	      } else {
	        receiverIds = (participants || []).map((p) => p.user_id).filter((id) => id && id !== msg.user_id);
	      }

	      // Segurança: em conversa privada deve existir exatamente 1 destinatário
	      if (!isGroup && receiverIds.length !== 1) {
	        throw new Error(
	          `Recipient mismatch for private conversation ${msg.conversation_id}: expected 1, got ${receiverIds.length}`
	        );
	      }

	      let senderName = 'Nova mensagem';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', msg.user_id)
	          .maybeSingle();
	        senderName = prof?.username || prof?.full_name || senderName;
	        if (prof?.avatar_url) imageUrl = prof.avatar_url;
	      } catch {}

	      title = senderName;
	      message = safePreview(msg.content || 'Você recebeu uma nova mensagem');
      url = `${baseUrl}/messages?conversation=${encodeURIComponent(msg.conversation_id)}`;
      data = {
        eventType,
        conversationId: msg.conversation_id,
        messageId: msg.id,
        senderId: msg.user_id,
        url,
      };
    }

    if (table === 'mentions') {
      eventType = 'mention';
      const m = record;
      receiverIds = m?.mentioned_user_id ? [m.mentioned_user_id] : [];

	      let actorName = 'Alguém';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', m.user_id)
	          .maybeSingle();
	        actorName = prof?.username || prof?.full_name || actorName;
	        if (prof?.avatar_url) imageUrl = prof.avatar_url;
	      } catch {}

	      title = `${actorName} mencionou você`;
	      message = 'Toque para ver a menção.';
	      if (m?.content_type === 'message') {
	        url = `${baseUrl}/messages`;
	      } else if (m?.content_type === 'post' || m?.content_type === 'comment') {
	        url = `${baseUrl}/arena`;
	      } else {
	        url = `${baseUrl}/news`;
	      }
      data = {
        eventType,
        mentionId: m?.id,
        contentType: m?.content_type,
        contentId: m?.content_id,
        url,
      };
    }

    if (table === 'friend_requests') {
      eventType = 'friend_request';
      const fr = record;
      // Only notify new pending requests
      if (fr?.status && String(fr.status) !== 'pending') {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'non-pending-friend-request' }) };
      }
      receiverIds = fr?.receiver_id ? [fr.receiver_id] : [];

	      let senderName = 'Alguém';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', fr.sender_id)
	          .maybeSingle();
	        senderName = prof?.username || prof?.full_name || senderName;
	        if (prof?.avatar_url) imageUrl = prof.avatar_url;
	      } catch {}

	      title = `${senderName} quer ser seu amigo`;
	      message = 'Toque para ver o pedido de amizade.';
	      url = `${baseUrl}/news`;
      data = { eventType, friendRequestId: fr?.id, senderId: fr?.sender_id, url };
    }

    if (table === 'attention_calls') {
      eventType = 'attention_call';
      const call = record;
      receiverIds = call?.receiver_id ? [call.receiver_id] : [];

      // Respect silence settings (best-effort)
      if (call?.receiver_id && call?.sender_id) {
        const { data: silence, error: sErr } = await supabaseAdmin
          .from('attention_silence_settings')
          .select('silenced_until')
          .eq('user_id', call.receiver_id)
          .eq('sender_id', call.sender_id)
          .order('silenced_until', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!sErr && silence?.silenced_until) {
          const until = new Date(silence.silenced_until).getTime();
          if (!Number.isNaN(until) && until > Date.now()) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ ok: true, skipped: true, reason: 'attention-silenced' }),
            };
          }
        }
      }

	      let senderName = 'Alguém';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', call.sender_id)
	          .maybeSingle();
	        senderName = prof?.username || prof?.full_name || senderName;
	        if (prof?.avatar_url) imageUrl = prof.avatar_url;
	      } catch {}

	      title = `${senderName} chamou sua atenção`;
	      message = safePreview(call?.message || 'Toque para ver.');
      url = `${baseUrl}/messages`;
      data = { eventType, attentionCallId: call?.id, senderId: call?.sender_id, url };
    }

    if (table === 'comments') {
      eventType = 'comment';
      const comment = record;
      if (!comment?.post_id) throw new Error('Webhook payload missing comment.post_id');

      const { data: post, error: postErr } = await supabaseAdmin
        .from('posts')
        .select('id, user_id')
        .eq('id', comment.post_id)
        .maybeSingle();
      if (postErr) throw postErr;
      if (!post) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'post-not-found' }) };

      receiverIds = post.user_id ? [post.user_id] : [];
      receiverIds = receiverIds.filter((id) => id && id !== comment.user_id);

      let commenterName = 'Alguém';
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
	          .select('username, full_name, avatar_url')
          .eq('id', comment.user_id)
          .maybeSingle();
        commenterName = prof?.username || prof?.full_name || commenterName;
	        if (prof?.avatar_url) imageUrl = prof.avatar_url;
      } catch {}

	      title = `${commenterName} comentou`;
	      message = safePreview(comment.content || 'Novo comentário');
      url = `${baseUrl}/arena`;
      data = { eventType, commentId: comment.id, postId: comment.post_id, senderId: comment.user_id, url };
    }

    if (table === 'posts') {
      eventType = 'post';
      const post = record;
      if (!post?.user_id) throw new Error('Webhook payload missing post.user_id');

      const { data: followers, error: fErr } = await supabaseAdmin
        .from('followers')
        .select('follower_id')
        .eq('following_id', post.user_id);
      if (fErr) throw fErr;

      const { data: friendsA } = await supabaseAdmin
        .from('friendships')
        .select('friend_id')
        .eq('user_id', post.user_id);
      const { data: friendsB } = await supabaseAdmin
        .from('friendships')
        .select('user_id')
        .eq('friend_id', post.user_id);

      const ids = new Set();
      (followers || []).forEach((r) => r?.follower_id && ids.add(r.follower_id));
      (friendsA || []).forEach((r) => r?.friend_id && ids.add(r.friend_id));
      (friendsB || []).forEach((r) => r?.user_id && ids.add(r.user_id));
      ids.delete(post.user_id);
      receiverIds = Array.from(ids);

      let authorName = 'Seu amigo';
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
	          .select('username, full_name, avatar_url')
          .eq('id', post.user_id)
          .maybeSingle();
        authorName = prof?.username || prof?.full_name || authorName;
	        if (prof?.avatar_url) imageUrl = prof.avatar_url;
      } catch {}
	      // Prefer first post media as big image when available
	      try {
	        if (Array.isArray(post.media_urls) && post.media_urls[0]) imageUrl = post.media_urls[0];
	      } catch {}

	      title = `${authorName} postou na Arena`;
	      message = safePreview(post.content || 'Novo post');
      url = `${baseUrl}/arena`;
      data = { eventType, postId: post.id, authorId: post.user_id, url };
    }

    // Not a table we care about.
    if (!eventType) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'table-not-handled', table }) };
    }

	    receiverIds = uniqStrings(receiverIds);
	    receiverIds = await filterByPreferences(supabaseAdmin, receiverIds, eventType);
	    receiverIds = uniqStrings(receiverIds);

    const result = await sendOneSignalNotification({
      appId: ONESIGNAL_APP_ID,
      restApiKey: ONESIGNAL_REST_API_KEY,
      targetExternalIds: receiverIds,
      title,
      message,
      url,
	      data,
	      appIconUrl,
	      imageUrl,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, eventType, table, receiverIds, result }),
    };
  } catch (e) {
    console.error('db-webhook error', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e?.message || 'Unknown error', details: e?.details, table, schema, type }),
    };
  }
}
