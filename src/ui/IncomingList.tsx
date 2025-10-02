import React from 'react'
import { useCallStore } from '@/store/callStore'
import { supabase } from '@/lib/supabaseClient'
import { joinRoom } from '@/lib/livekit'

export function IncomingList() {
  const invites = useCallStore(s => s.invites)

  const accept = async (inviteId: string) => {
    const invite = invites.find(i => i.id === inviteId)!
    await supabase.from('video_calls').update({ status: 'accepted' }).eq('id', inviteId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await joinRoom(invite.room_name, user.id)
  }

  const decline = async (inviteId: string) => {
    await supabase.from('video_calls').update({ status: 'declined' }).eq('id', inviteId)
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Convites recebidos</h3>
      {invites.length === 0 && <div>Nenhum convite.</div>}
      {invites.map(i => (
        <div key={i.id} style={{ padding: 8, border: '1px solid #ccc', marginTop: 8, borderRadius: 8 }}>
          <div>De: {i.from_user_id}</div>
          <div>Sala: {i.room_name}</div>
          <div>Status: {i.status}</div>
          <button onClick={() => accept(i.id)}>Aceitar</button>{' '}
          <button onClick={() => decline(i.id)}>Recusar</button>
        </div>
      ))}
    </div>
  )
}
