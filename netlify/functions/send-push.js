import * as webpush from 'web-push';
import { corsHeaders, createAdminClient, requireUser } from './_shared.js';

const safeJson = (str) => {
  try { return JSON.parse(str || '{}'); } catch { return null; }
};

const getVapidDetails = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  if (!publicKey || !privateKey) throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas');
  return { publicKey, privateKey, subject };
};

const buildPayload = ({ title, body, icon, badge, image, url, tag, data }) => {
  return JSON.stringify({
    title: title || 'UDG',
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: badge || '/icon-192.png',
    image: image || undefined,
    tag: tag || undefined,
    data: { ...(data || {}), url: url || (data && data.url) || '/' },
  });
};

const mapReceiversFromConversation = async (supabaseAdmin, conversationId, senderId) => {
  const { data, error } = await supabaseAdmin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId);
  if (error) throw error;
  return (data || []).map(r => r.user_id).filter(uid => uid && uid !== senderId);
};

const sendToUsers = async (supabaseAdmin, userIds, payloadString) => {
  if (!userIds?.length) return { sent: 0, failed: 0 };

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .in('user_id', userIds);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  const expired = [];

  for (const s of (subs || [])) {
    const subscription = {
      endpoint: s.endpoint,
      keys: { p256dh: s.keys_p256dh, auth: s.keys_auth },
    };

    try {
      await webpush.sendNotification(subscription, payloadString);
      sent += 1;
    } catch (err) {
      failed += 1;
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) expired.push(s.endpoint);
    }
  }

  if (expired.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', expired);
  }

  return { sent, failed };
};

export const handler = async (event) => {
  const headers = corsHeaders('POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const body = safeJson(event.body);
  if (!body) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) };

  try {
    const supabaseAdmin = createAdminClient();
    const auth = await requireUser(event, supabaseAdmin);
    if (!auth.ok) return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };

    const senderId = auth.user.id;

    const { publicKey, privateKey, subject } = getVapidDetails();
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const eventType = body.eventType || 'custom';
    const targetUserId = body.userId || null;

    let receiverIds = [];
    let title = body.title;
    let msg = body.body;
    let image = body.image || null;
    let url = body.url || '/';
    let tag = body.tag || eventType;
    let data = body.data || {};

    if (eventType === 'test') {
      receiverIds = [senderId];
      title = title || '🔔 Teste';
      msg = msg || 'Notificação de teste';
      url = url || '/news';
      tag = tag || 'test';
    } else if (eventType === 'friend_request') {
      if (!body.requestId) throw new Error('requestId ausente');
      const { data: req, error } = await supabaseAdmin
        .from('friend_requests')
        .select('id, sender_id, receiver_id')
        .eq('id', body.requestId)
        .single();
      if (error) throw error;
      receiverIds = [req.receiver_id];

      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', req.sender_id)
        .single();
      const senderName = prof?.username || 'Alguém';
      image = image || prof?.avatar_url || null;

      title = title || '🤝 Pedido de amizade';
      msg = msg || `${senderName} enviou um pedido de amizade`;
      url = url || '/messages?tab=contacts';
      data = { ...data, requestId: req.id };
    } else if (eventType === 'mention') {
      if (!body.mentionId) throw new Error('mentionId ausente');
      const { data: mention, error } = await supabaseAdmin
        .from('mentions')
        .select('id, user_id, mentioned_user_id, content_type, content_id, created_at')
        .eq('id', body.mentionId)
        .single();
      if (error) throw error;

      receiverIds = [mention.mentioned_user_id];

      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', mention.user_id)
        .single();
      const senderName = prof?.username || 'Alguém';
      image = image || prof?.avatar_url || null;

      title = title || '🔔 Menção';
      msg = msg || `${senderName} mencionou você`;
      url = url || (mention.content_type === 'message'
        ? `/messages?tab=chats&conversation=${mention.content_id}`
        : '/news');

      data = { ...data, mentionId: mention.id, contentType: mention.content_type, contentId: mention.content_id };
    } else if (eventType === 'attention_call') {
      if (!body.attentionCallId) throw new Error('attentionCallId ausente');
      const { data: call, error } = await supabaseAdmin
        .from('attention_calls')
        .select('id, sender_id, receiver_id, message, created_at')
        .eq('id', body.attentionCallId)
        .single();
      if (error) throw error;

      receiverIds = [call.receiver_id];

      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', call.sender_id)
        .single();
      const senderName = prof?.username || 'Alguém';
      image = image || prof?.avatar_url || null;

      title = title || '⚠️ Chamar atenção';
      msg = msg || `${senderName} está chamando sua atenção`;
      url = url || '/messages';
      data = { ...data, attentionCallId: call.id, senderId: call.sender_id };
    } else if (eventType === 'message') {
      if (!body.messageId) throw new Error('messageId ausente');
      const { data: m, error } = await supabaseAdmin
        .from('messages')
        .select('id, conversation_id, user_id, content, created_at')
        .eq('id', body.messageId)
        .single();
      if (error) throw error;

      receiverIds = await mapReceiversFromConversation(supabaseAdmin, m.conversation_id, m.user_id);

      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', m.user_id)
        .single();
      const senderName = prof?.username || 'Alguém';
      image = image || prof?.avatar_url || null;

      title = title || `💬 Mensagem de ${senderName}`;
      msg = msg || (m.content || 'Você recebeu uma nova mensagem');
      url = url || `/messages?tab=chats&conversation=${m.conversation_id}`;
      data = { ...data, messageId: m.id, conversationId: m.conversation_id, senderId: m.user_id };
    } else if (targetUserId) {
      receiverIds = [targetUserId];
    }

    const payloadString = buildPayload({ title, body: msg, image, url, tag, data });
    const result = await sendToUsers(supabaseAdmin, receiverIds, payloadString);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
  }
};
