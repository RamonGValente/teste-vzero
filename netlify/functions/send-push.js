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

function isHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
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
  const targets = uniqStrings(targetExternalIds);
  if (!targets.length) return { ok: true, skipped: true };

  const payload = {
    app_id: appId,
    target_channel: 'push',
    headings: { pt: title, en: title },
    contents: { pt: message, en: message },
    url,
    data,
    include_aliases: { external_id: targets },
  };

  // Melhor visual (logo do app + imagem do remetente quando possível)
  if (appIconUrl && isHttpUrl(appIconUrl)) {
    payload.chrome_web_icon = appIconUrl;   // ícone do app (web push)
    payload.firefox_icon = appIconUrl;
    payload.chrome_web_badge = appIconUrl;
    payload.small_icon = appIconUrl;        // fallback (alguns ambientes)
  }

  if (imageUrl && isHttpUrl(imageUrl)) {
    // Foto do remetente/autor (onde suportado)
    payload.chrome_web_image = imageUrl;    // imagem grande no Chrome (web push)
    payload.large_icon = imageUrl;          // Android (quando aplicável)
    payload.ios_attachments = { id: imageUrl }; // iOS (quando aplicável)
  } else if (appIconUrl && isHttpUrl(appIconUrl)) {
    // Fallback: se não houver foto do remetente, usa o ícone do app
    payload.large_icon = appIconUrl;
  }

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
  const appIconUrl = `${baseUrl}/push-icon.png`;

  try {
    let receiverIds = [];
    let title = 'Notificação';
    let message = '';
    let url = `${baseUrl}/news`;
    let data = { eventType };
	    let imageUrl = null;

    if (eventType === 'test') {
      receiverIds = [auth.user.id];
      title = 'Teste de Push';
      message = 'Se você recebeu isso, o OneSignal está funcionando ✅';
      url = `${baseUrl}/news`;
      data = { eventType: 'test' };
	      imageUrl = null;
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

	      // Descobre se é conversa privada ou grupo
	      const { data: conv } = await supabaseAdmin
	        .from('conversations')
	        .select('id, is_group, max_participants')
	        .eq('id', msg.conversation_id)
	        .maybeSingle();

	      const { data: participants, error: pErr } = await supabaseAdmin
	        .from('conversation_participants')
	        .select('user_id, joined_at')
	        .eq('conversation_id', msg.conversation_id)
	        .order('joined_at', { ascending: true });
      if (pErr) throw pErr;

	      // Anti-vazamento: se for conversa privada (2 pessoas), notifica SOMENTE a outra pessoa.
	      // Se houver participantes extras por inconsistência, usamos os 2 primeiros por joined_at.
	      let participantIds = (participants || []).map((p) => p.user_id);
	      if (conv && conv.is_group === false) {
	        const firstTwo = [];
	        const seen = new Set();
	        for (const id of participantIds) {
	          if (!id || seen.has(id)) continue;
	          seen.add(id);
	          firstTwo.push(id);
	          if (firstTwo.length >= 2) break;
	        }
	        participantIds = firstTwo;
	      }

	      receiverIds = uniqStrings(participantIds).filter((id) => id && id !== msg.user_id);

      // Segurança: em conversa privada deve existir exatamente 1 destinatário (evita push para "todo mundo")
      if (conv && conv.is_group === false && receiverIds.length !== 1) {
        throw new Error(
          `Recipient mismatch for private conversation ${msg.conversation_id}: expected 1, got ${receiverIds.length}`
        );
      }


	      // Nome + foto do remetente (melhora visual da notificação)
	      let senderName = 'Nova mensagem';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', msg.user_id)
	          .maybeSingle();
	        senderName = prof?.username || prof?.full_name || senderName;
	        } catch {}

	      title = senderName;
	      message = 'Você recebeu uma nova mensagem.';
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
	      let senderName = 'Alguém';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', fr.sender_id)
	          .maybeSingle();
	        senderName = prof?.username || prof?.full_name || senderName;
	        } catch {}
	      title = `${senderName} quer ser seu amigo`;
	      message = 'Toque para abrir o UnDoInG.';
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
	      let actorName = 'Alguém';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', mention.user_id)
	          .maybeSingle();
	        actorName = prof?.username || prof?.full_name || actorName;
	        } catch {}

	      title = `${actorName} mencionou você`;
	      message = 'Toque para ver.';
	      // tentativa de deep-link dependendo do tipo
	      url = mention.content_type === 'message'
	        ? `${baseUrl}/messages`
	        : `${baseUrl}/arena`;
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
	      let senderName = 'Alguém';
	      try {
	        const { data: prof } = await supabaseAdmin
	          .from('profiles')
	          .select('username, full_name, avatar_url')
	          .eq('id', call.sender_id)
	          .maybeSingle();
	        senderName = prof?.username || prof?.full_name || senderName;
	        } catch {}
	      title = `${senderName} chamou sua atenção`;
	      message = safePreview(call.message || 'Toque para abrir o UnDoInG.');
      url = `${baseUrl}/messages`;
      data = { eventType: 'attention_call', attentionCallId: call.id, senderId: call.sender_id, url };
    }

    if (eventType === 'comment') {
      const { commentId } = payload;
      if (!commentId) throw new Error('Missing commentId');

      const { data: comment, error: comErr } = await supabaseAdmin
        .from('comments')
        .select('id, post_id, user_id, content, created_at')
        .eq('id', commentId)
        .maybeSingle();
      if (comErr) throw comErr;
      if (!comment) throw new Error('Comment not found');

      const { data: post, error: postErr } = await supabaseAdmin
        .from('posts')
        .select('id, user_id')
        .eq('id', comment.post_id)
        .maybeSingle();
      if (postErr) throw postErr;
      if (!post) throw new Error('Post not found for comment');

      // dono do post recebe, exceto se ele mesmo comentou
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
	        } catch {}

	      title = `${commenterName} comentou`;
	      message = 'Você recebeu um novo comentário.';
      url = `${baseUrl}/arena`;
      data = {
        eventType: 'comment',
        commentId: comment.id,
        postId: comment.post_id,
        senderId: comment.user_id,
        url,
      };
    }

    if (eventType === 'post') {
      const { postId } = payload;
      if (!postId) throw new Error('Missing postId');

      const { data: post, error: pErr } = await supabaseAdmin
        .from('posts')
        .select('id, user_id, content, created_at')
        .eq('id', postId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!post) throw new Error('Post not found');

      // seguidores
      const { data: followers, error: fErr } = await supabaseAdmin
        .from('followers')
        .select('follower_id')
        .eq('following_id', post.user_id);
      if (fErr) throw fErr;

      // amigos (tenta ambos sentidos)
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
	        } catch {}

	      title = `${authorName} postou na Arena`;
	      message = 'Um amigo fez uma nova postagem na Arena.';
      url = `${baseUrl}/arena`;
      data = { eventType: 'post', postId: post.id, authorId: post.user_id, url };
    }

    // Filter by user preferences (best-effort; default allow)
    if (receiverIds.length) {
      const { data: prefs, error: prefErr } = await supabaseAdmin
        .from('notification_preferences')
        .select('user_id, push_enabled, messages, mentions, attention_calls, friend_requests, comments, posts')
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
            case 'attention_call':
              return p.attention_calls !== false;
            case 'comment':
              return p.comments !== false;
            case 'post':
              return p.posts !== false;
            case 'test':
              return true;
            default:
              return true;
          }
        });
      }
    }

	    // Dedup final (evita disparo duplicado)
	    receiverIds = uniqStrings(receiverIds);
	
	    // Log útil no Netlify (para investigar "foi para todos")
	    console.log('[push] event=', eventType, 'receivers=', receiverIds.length, receiverIds.slice(0, 5));

	    const imageUrl = appIconUrl;

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