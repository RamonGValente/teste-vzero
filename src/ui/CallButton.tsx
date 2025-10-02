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
    <div>
      <h3 className="text-lg font-semibold mb-2">Iniciar chamada</h3>
      <input className="input" placeholder="UUID do destinatário" value={receiverId} onChange={e => setReceiverId(e.target.value)} />
      <div className="mt-2 space-x-2">
        <button className="btn" onClick={startCall}>Chamar</button>
      </div>
      <div className="mt-2 text-sm text-gray-600">Status: {status || '—'}</div>
    </div>
  )
}
