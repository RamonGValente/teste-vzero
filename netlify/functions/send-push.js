// netlify/functions/send-push.js
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const { userId, title, body, icon, badge, url, tag } = JSON.parse(event.body);

    // Configurar web-push com as chaves VAPID
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT; // geralmente um mailto: ou uma URL

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Chaves VAPID não configuradas');
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Inicializar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usar service role para bypass RLS se necessário
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todas as subscriptions do usuário
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Nenhuma subscription encontrada para o usuário' }) };
    }

    // Enviar notificação para cada subscription
    const sendPromises = subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys_p256dh,
          auth: subscription.keys_auth
        }
      };

      const payload = JSON.stringify({
        title,
        body,
        icon: icon || '/icon-192.png',
        badge: badge || '/badge-72.png',
        tag: tag || 'general',
        url: url || '/news',
        timestamp: Date.now()
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        console.log('Notificação enviada para:', subscription.endpoint);
        return { success: true, endpoint: subscription.endpoint };
      } catch (pushError) {
        console.error('Erro ao enviar notificação:', pushError);
        // Se a subscription for inválida, podemos removê-la do banco
        if (pushError.statusCode === 410) { // 410 Gone
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
        return { success: false, endpoint: subscription.endpoint, error: pushError.message };
      }
    });

    const results = await Promise.all(sendPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      })
    };
  } catch (error) {
    console.error('Erro ao enviar push:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
    };
  }
};