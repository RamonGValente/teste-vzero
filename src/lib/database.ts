
import { supabase } from './supabase';

export const createProfile = async (userId: string) => {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: user.user?.user_metadata?.full_name || 'Usuário',
      email: user.user?.email || '',
      avatar_url: null,
      status: 'online',
      last_seen: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updateUserStatus = async (userId: string, status: 'online' | 'offline') => {
  const { error } = await supabase
    .from('profiles')
    .update({
      status,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
};
