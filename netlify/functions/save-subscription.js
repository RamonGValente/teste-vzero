// netlify/functions/save-subscription.js (ESM)
// OBS: Use este endpoint se você quiser salvar subscriptions via backend.
// Em geral, é melhor salvar direto no Supabase com RLS permitindo user_id = auth.uid().

import { createClient } from '@supabase/supabase-js';

const jsonResponse = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
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
    const payload = JSON.parse(event.body || '{}');
    const userId = payload.userId;
    const sub = payload.subscription;

    if (!userId || !sub?.endpoint) {
      return jsonResponse(400, { error: 'Campos obrigatórios: userId e subscription.endpoint' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_V1;

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse(500, {
        error: 'Supabase não configurado',
        details: 'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify.',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Atualiza por endpoint se existir; senão insere.
    const { data: existing, error: findErr } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', sub.endpoint)
      .maybeSingle();

    if (findErr) {
      return jsonResponse(500, { error: 'Erro ao consultar subscription existente', details: findErr.message });
    }

    const row = {
      user_id: userId,
      endpoint: sub.endpoint,
      expiration_time: sub.expirationTime ?? null,
      keys_p256dh: sub.keys?.p256dh ?? null,
      keys_auth: sub.keys?.auth ?? null,
    };

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from('push_subscriptions')
        .update(row)
        .eq('id', existing.id);

      if (updErr) return jsonResponse(500, { error: 'Erro ao atualizar subscription', details: updErr.message });
    } else {
      const { error: insErr } = await supabase.from('push_subscriptions').insert(row);
      if (insErr) return jsonResponse(500, { error: 'Erro ao inserir subscription', details: insErr.message });
    }

    return jsonResponse(200, { success: true });
  } catch (err) {
    return jsonResponse(500, { error: 'Erro interno do servidor', details: err?.message || String(err) });
  }
};
