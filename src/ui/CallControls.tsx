import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCallStore } from '@/store/callStore'
import { joinRoom } from '@/lib/livekit'
export function CallControls({ peerId }:{ peerId:string }){
  const invites = useCallStore(s=>s.invites)
  const call = async(type:'video'|'audio')=>{
    const { data:{ user } } = await supabase.auth.getUser(); if(!user) return alert('Faça login')
    const { data, error } = await supabase.from('video_calls').insert({
      caller_id:user.id, receiver_id:peerId, room_id:crypto.randomUUID(), call_type:type, status:'calling'
    }).select().single(); if(error) return alert(error.message); console.log('Chamando...', data?.id)
  }
  const accept = async(id:string, room:string)=>{
    await supabase.from('video_calls').update({ status:'accepted' }).eq('id', id)
    const { data:{ user } } = await supabase.auth.getUser(); if(!user) return
    await joinRoom(room, user.id)
  }
  const pending = invites.filter(i=> i.from_user_id===peerId && i.status==='calling')
  return (<div className="flex items-center gap-2">
    <button className="btn" onClick={()=>call('video')}>📹 Vídeo</button>
    <button className="btn" onClick={()=>call('audio')}>🎤 Voz</button>
    {pending.length>0 && (<div className="ml-2">
      {pending.map(p=>(<button key={p.id} className="btn" onClick={()=>accept(p.id, p.room_name)}>Aceitar convite</button>))}
    </div>)}
  </div>)
}
