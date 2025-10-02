import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCallStore } from '@/store/callStore'

export function useRealtimeInvites(userId?: string) {
  const upsertInvite = useCallStore(s => s.upsertInvite)

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('vcalls_'+userId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_calls',
        filter: `receiver_id=eq.${userId}`,
      }, payload => {
        const row: any = payload.new ?? payload.old
        if (!row) return
        upsertInvite({
          id: row.id,
          from_user_id: row.caller_id,
          to_user_id: row.receiver_id,
          room_name: row.room_id,
          status: row.status,
          created_at: row.created_at,
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, upsertInvite])
}
