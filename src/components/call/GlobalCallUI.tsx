import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCall } from '@/hooks/useCall'
import { Button } from '@/components/ui/button'

export const GlobalCallUI: React.FC = () => {
  const { status, incoming, acceptCall, declineCall, endCall, listenInvites, callId } = useCall()
  const [open, setOpen] = useState(false)
  const mediaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (uid) listenInvites(uid)
    })
  }, [listenInvites])

  useEffect(() => {
    const shouldOpen = !!incoming || status === 'calling' || status === 'in-call' || status === 'ringing'
    setOpen(shouldOpen)
  }, [incoming, status])

  if (!open) return null
  const isIncoming = !!incoming
  const title = isIncoming ? (incoming?.call_type === 'audio' ? 'Chamada de voz' : 'Chamada de vídeo') : 'Conectando...'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="bg-background w-[min(640px,92vw)] rounded-2xl shadow-xl border p-6">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">Status: {status}</p>

        <div id="lk-media" ref={mediaRef} className="aspect-video bg-muted rounded-xl mb-4 overflow-hidden grid place-items-center text-muted-foreground">
          {status !== 'in-call' && <span>Aguardando conexão…</span>}
        </div>

        <div className="flex justify-end gap-3">
          {isIncoming ? (
            <>
              <Button variant="secondary" onClick={() => declineCall(incoming!.call_id)}>Recusar</Button>
              <Button onClick={() => acceptCall(incoming!.call_id, mediaRef.current!)}>Atender</Button>
            </>
          ) : (
            <Button variant="destructive" onClick={() => { if (callId) endCall(callId); setOpen(false) }}>Encerrar</Button>
          )}
        </div>
      </div>
    </div>
  )
}
 // (o