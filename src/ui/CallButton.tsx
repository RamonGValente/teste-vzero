import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function CallButton() {
  const [receiverId, setReceiverId] = useState('')
  const [status, setStatus] = useState<string>('')

  const startCall = async () => {
    setStatus('enviando...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('sem usuário'); return }
    const { data, error } = await supabase.from('video_calls').insert({
      caller_id: user.id,
      receiver_id: receiverId,
      room_id: crypto.randomUUID(),
      call_type: 'video',
      status: 'calling'
    }).select().single()
    if (error) setStatus('erro: ' + error.message)
    else setStatus('ok: ' + data.id)
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Iniciar chamada</h3>
      <input placeholder="UUID do destinatário" value={receiverId} onChange={e => setReceiverId(e.target.value)} style={{ width: 360 }} />
      <button onClick={startCall} style={{ marginLeft: 8 }}>Chamar</button>
      <div style={{ marginTop: 8, opacity: .7 }}>Status: {status || '—'}</div>
    </div>
  )
}
