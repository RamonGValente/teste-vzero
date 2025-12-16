// netlify/functions/send-push.js (ESM)
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const jsonResponse = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método não permitido' });
  }

  try {
    const { userId, title, body, icon, badge, url, tag, data, actions } = JSON.parse(event.body || '{}');

    if (!userId) {
      return jsonResponse(400, { error: 'userId é obrigatório' });
    }

    // VAPID (preferimos variáveis do backend; mas aceitamos fallback se você reutiliza nomes do Vite)
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return jsonResponse(500, {
        error: 'Chaves VAPID não configuradas',
        details: 'Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas variáveis de ambiente do Netlify.',
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Supabase (precisa ser service-role para poder ler subscriptions de qualquer usuário)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_V1;

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse(500, {
        error: 'Supabase não configurado',
        details: 'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify.',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, keys_p256dh, keys_auth')
      .eq('user_id', userId);

    if (error) {
      return jsonResponse(500, { error: 'Erro ao buscar subscriptions', details: error.message });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return jsonResponse(404, { error: 'Nenhuma subscription encontrada para este usuário' });
    }

    const payload = {
      title: title || 'UDG',
      body: body || 'Nova notificação',
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      tag: tag || 'udg-general',
      url: url || '/news',
      data: data || {},
      actions: actions,
      timestamp: Date.now(),
    };

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
          return { success: true, endpoint: sub.endpoint };
        } catch (pushError) {
          // Se subscription expirou/foi removida, limpamos.
          const statusCode = pushError?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
          return {
            success: false,
            endpoint: sub.endpoint,
            statusCode,
            error: pushError?.message || String(pushError),
          };
        }
      })
    );

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;

    return jsonResponse(200, { success: true, sent, failed, results });
  } catch (err) {
    return jsonResponse(500, { error: 'Erro interno do servidor', details: err?.message || String(err) });
  }
};
