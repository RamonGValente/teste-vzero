import { createClient } from '@supabase/supabase-js';

export const corsHeaders = (methods = 'GET, POST, OPTIONS') => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': methods,
});

export const createAdminClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const getBearerToken = (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

export const requireUser = async (event, supabaseAdmin) => {
  const token = getBearerToken(event);
  if (!token) return { ok: false, statusCode: 401, body: { error: 'Token ausente' } };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { ok: false, statusCode: 401, body: { error: 'Token inválido' } };

  return { ok: true, user: data.user, token };
};
