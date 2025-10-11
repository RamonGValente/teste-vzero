import { supabase } from '@/integrations/supabase/client';

export async function logout() {
  try { await supabase.rpc('update_self_status', { new_status: 'offline' }); } catch {}
  await supabase.auth.signOut();
}
