import { supabase } from '@/lib/supabase';

export function subscribeProfilesRealtime(onChange: (row: any) => void) {
  const ch = supabase
    .channel('profiles-changes-ui')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
      onChange(payload.new ?? payload.old);
    })
    .subscribe();

  return () => { ch.unsubscribe(); };
}
