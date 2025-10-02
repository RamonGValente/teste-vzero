import React, { useEffect, useRef } from 'react'
import { useCall } from '@/hooks/useCall'
import { Button } from '@/components/ui/button'

export const CallModal: React.FC<{ open: boolean; onClose: () => void; callerName?: string; }> = ({ open, onClose }) => {
  const { status, incoming, acceptCall, declineCall, endCall, callId } = useCall()
  const mediaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'in-call' && mediaRef.current) {
      // container where remote tracks will appear (added by connectAndAttach)
    }
  }, [status])

  if (!open) return null
  const isIncoming = !!incoming
  const title = isIncoming ? (incoming?.call_type === 'audio' ? 'Chamada de voz' : 'Chamada de vídeo') : 'Conectando…'

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="bg-background p-6 rounded-2xl w-[min(620px,92vw)] shadow-xl border">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">Status: {status}</p>

        <div ref={mediaRef} id="lk-media" className="aspect-video bg-muted rounded-xl mb-4 overflow-hidden grid place-items-center text-muted-foreground">
          {status !== 'in-call' && <span>Aguardando conexão…</span>}
        </div>

        <div className="flex gap-3 justify-end">
          {isIncoming ? (
            <>
              <Button variant="secondary" onClick={() => declineCall(incoming!.call_id)}>Recusar</Button>
              <Button onClick={() => acceptCall(incoming!.call_id, mediaRef.current!)}>Atender</Button>
            </>
          ) : (
            <Button variant="destructive" onClick={() => { if (callId) endCall(callId); onClose(); }}>Encerrar</Button>
          )}
        </div>
      </div>
    </div>
  )
}