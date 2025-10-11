import { supabase } from '@/lib/supabase';

export async function updateSelfStatus(status: 'online' | 'offline') {
  const { error } = await supabase.rpc('update_self_status', { new_status: status });
  if (error) throw error;
}
