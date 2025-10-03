import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useChatStore } from '@/store/chatStore'
import type { Message, UUID } from '@/types'
export function useRealtimeMessages(selfId?: UUID, peerId?: UUID) { const push = useChatStore(s=>s.pushMessage); useEffect(()=>{ if(!selfId || !peerId) return; const ch = supabase.channel('msgs_'+selfId+'_'+peerId); ch.on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`receiver_id=eq.${selfId}` }, (pl)=>{ const row = pl.new as any; if(row.sender_id===peerId) push(peerId, row as Message) }); ch.subscribe(); return ()=>{ supabase.removeChannel(ch) } },[selfId, peerId, push]) }
