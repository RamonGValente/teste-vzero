// netlify/functions/save-subscription.cjs
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Verificar método HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    const subscription = JSON.parse(event.body);
    
    // Inicializar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se já existe uma subscription para este endpoint
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single();

    if (existing) {
      // Atualizar subscription existente
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Inserir nova subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          user_id: subscription.userId, // Você precisaria enviar o userId do cliente
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Erro ao salvar subscription:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
    };
  }
};