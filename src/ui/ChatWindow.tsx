import React, { useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useChatStore } from '@/store/chatStore'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import type { Message } from '@/types'
import { format } from 'date-fns'
import { CallControls } from './CallControls'
export function ChatWindow(){
  const selfId = useChatStore(s=>s.selfId); const peerId = useChatStore(s=>s.activePeerId)
  const setMessagesFor = useChatStore(s=>s.setMessagesFor); const messagesMap=useChatStore(s=>s.messages)
  const messages = messagesMap[peerId ?? ''] ?? []
  useRealtimeMessages(selfId, peerId)
  useEffect(()=>{
    const load = async()=>{
      if(!selfId || !peerId) return
      const { data, error } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${selfId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${selfId})`)
        .order('created_at', { ascending: true })
      if(error){ console.error(error); return }
      setMessagesFor(peerId, data as Message[])
    }; load()
  },[selfId, peerId, setMessagesFor])
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{ listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages.length])
  if(!peerId) return <div className="h-full flex items-center justify-center text-muted">Selecione um contato</div>
  return (<div className="h-full grid grid-rows-[auto_1fr_auto]">
    <div className="border-b p-3 flex items-center justify-between"><div className="font-semibold">Conversa</div><CallControls peerId={peerId}/></div>
    <div ref={listRef} className="overflow-y-auto p-4 space-y-2">{messages.map(m=>(<MessageBubble key={m.id} self={m.sender_id===selfId} text={m.content} ts={m.created_at}/>))}</div>
    <MessageInput/>
  </div>)
}
function MessageBubble({ self, text, ts }:{ self:boolean, text:string, ts:string }){
  return (<div className={'max-w-[70%] '+(self?'ml-auto':'mr-auto')}>
    <div className={(self?'bg-blue-600 text-white':'bg-white border')+' px-3 py-2 rounded-2xl'}>{text}</div>
    <div className="text-[10px] text-muted mt-1">{format(new Date(ts), 'dd/MM HH:mm')}</div>
  </div>)
}
function MessageInput(){
  const [value,setValue] = React.useState('')
  const selfId = useChatStore(s=>s.selfId); const peerId = useChatStore(s=>s.activePeerId)
  const push = useChatStore(s=>s.pushMessage)
  const canSend = React.useMemo(()=> !!(selfId && peerId && value.trim()), [selfId, peerId, value])
  const send = async()=>{
    if(!canSend) return
    const { data, error } = await supabase.from('messages').insert({ sender_id:selfId, receiver_id:peerId, content:value.trim() }).select().single()
    if(error){ alert(error.message); return }
    push(peerId!, data!); setValue('')
  }
  return (<div className="border-t p-3 flex items-center gap-2">
    <input className="input" placeholder="Escreva uma mensagem..." value={value} onChange={e=>setValue(e.target.value)}/>
    <button className="btn" onClick={send} disabled={!canSend}>Enviar</button>
  </div>)
}
