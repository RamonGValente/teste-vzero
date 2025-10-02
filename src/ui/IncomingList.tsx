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
    <div>
      <h3 className="text-lg font-semibold mb-2">Convites recebidos</h3>
      {invites.length === 0 && <div className="text-gray-600">Nenhum convite.</div>}
      <div className="space-y-2">
        {invites.map(i => (
          <div key={i.id} className="border rounded-xl p-3">
            <div><span className="font-medium">De:</span> {i.from_user_id}</div>
            <div><span className="font-medium">Sala:</span> {i.room_name}</div>
            <div><span className="font-medium">Status:</span> {i.status}</div>
            <div className="mt-2 space-x-2">
              <button className="btn" onClick={() => accept(i.id)}>Aceitar</button>
              <button className="btn" onClick={() => decline(i.id)}>Recusar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
