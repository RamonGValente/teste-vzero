
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function usePresence(channelName: string, payload: Record<string, any>) {
  const [state, setState] = useState<any>({})
  useEffect(() => {
    const channel = supabase.channel(channelName, { config: { presence: { key: 'presence' } } })
    channel.on('presence', { event: 'sync' }, () => {
      setState(channel.presenceState())
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') channel.track(payload)
    })
    return () => { supabase.removeChannel(channel) }
  }, [channelName])
  return state
}
