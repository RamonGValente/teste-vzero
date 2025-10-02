import { create } from 'zustand'
import { supabase } from '@/lib/supabaseClient'
import { connectAndAttach } from '@/lib/livekit'
import { v4 as uuidv4_import } from 'uuid'

const uuidv4 =
  typeof crypto !== 'undefined' && (crypto as any).randomUUID
    ? () => (crypto as any).randomUUID()
    : uuidv4_import

type CallType = 'video' | 'audio'
type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'accepted'
  | 'in-call'
  | 'declined'
  | 'ended'
  | 'cancelled'

interface CallState {
  status: CallStatus
  currentRoomId?: string
  callId?: string
  error?: string
  incoming: { call_id: string; caller_id: string; call_type: CallType } | null
  _inviteChannel?: ReturnType<typeof supabase.channel> | null
  _callChannel?: ReturnType<typeof supabase.channel> | null

  startCall: (receiverId: string, callType: CallType) => Promise<void>
  acceptCall: (callId: string, container?: HTMLElement) => Promise<void>
  declineCall: (callId: string) => Promise<void>
  endCall: (callId?: string) => Promise<void>
  listenInvites: (userId: string) => Promise<void>
  clear: () => void
}

async function getToken(callId: string, roomId: string) {
  const { data, error } = await supabase.functions.invoke('generate-token', {
    body: { callId, roomId },
  })
  if (error) throw new Error(error.message || 'Falha ao gerar token')
  if (!data?.token) throw new Error('Token vazio da Edge Function')
  return data.token as string
}

export const useCall = create<CallState>((set, get) => ({
  status: 'idle',
  incoming: null,
  _inviteChannel: null,
  _callChannel: null,

  async startCall(receiverId, callType) {
    set({ status: 'calling', error: undefined })

    const { data: session } = await supabase.auth.getUser()
    const callerId = session.user?.id
    if (!callerId) {
      set({ status: 'idle', error: 'Sem sessão' })
      alert('Faça login para ligar')
      return
    }

    const roomId = 'room_' + uuidv4()
    const { data: call, error } = await supabase
      .from('video_calls')
      .insert({
        caller_id: callerId,
        receiver_id: receiverId,
        room_id: roomId,
        call_type: callType,
        status: 'calling',
      })
      .select('*')
      .single()

    if (error || !call) {
      console.error('[startCall]', error)
      set({ status: 'idle', error: error?.message })
      alert('Erro ao iniciar: ' + (error?.message ?? ''))
      return
    }

    set({ callId: call.id, currentRoomId: roomId })

    // Listener de status da chamada
    try { get()._callChannel?.unsubscribe() } catch {}
    const ch = supabase
      .channel('call-status-' + call.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'video_calls', filter: `id=eq.${call.id}` },
        async (payload) => {
          const row: any = payload.new
          if (row.status === 'accepted') {
            try {
              const token = await getToken(call.id, row.room_id)
              set({ status: 'in-call' })
              const container = document.getElementById('lk-media') as HTMLElement | null
              if (container) await connectAndAttach(token, container)
            } catch (e: any) {
              console.error(e)
              set({ error: e.message })
              alert('Falha ao conectar: ' + e.message)
            }
          } else if (['declined','ended','cancelled'].includes(row.status)) {
            set({ status: row.status })
          }
        },
      )
      .subscribe()
    set({ _callChannel: ch })
  },

  async acceptCall(callId, container) {
    try {
      const { data: vc, error } = await supabase
        .from('video_calls')
        .update({ status: 'accepted', started_at: new Date().toISOString() })
        .eq('id', callId)
        .select('*')
        .single()
      if (error || !vc) {
        console.error('[acceptCall]', error)
        set({ error: error?.message })
        alert('Erro ao aceitar: ' + (error?.message ?? 'RLS?'))
        return
      }
      const token = await getToken(callId, vc.room_id)
      if (container) await connectAndAttach(token, container)
      set({ status: 'in-call', callId, currentRoomId: vc.room_id, incoming: null })
    } catch (e: any) {
      console.error('[acceptCall]', e)
      set({ error: e.message })
      alert('Falha ao atender: ' + e.message + '\nA função generate-token está deployada?')
    }
  },

  async declineCall(callId) {
    await supabase.from('video_calls').update({ status: 'declined' }).eq('id', callId)
    set({ status: 'declined', incoming: null })
  },

  async endCall(callId) {
    const id = callId || get().callId
    if (id) await supabase.from('video_calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', id)
    try { get()._callChannel?.unsubscribe() } catch {}
    set({ status: 'ended', callId: undefined, currentRoomId: undefined })
  },

  async listenInvites(userId) {
    // 1) Catch-up para não depender do timing do Realtime
    const { data: pendente } = await supabase
      .from('video_calls')
      .select('id, caller_id, call_type')
      .eq('receiver_id', userId)
      .eq('status', 'calling')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendente) {
      set({
        incoming: { call_id: pendente.id, caller_id: pendente.caller_id, call_type: pendente.call_type as CallType },
        status: 'ringing',
      })
      try { const a = new Audio('/sounds/ringtone.mp3'); a.loop = true; a.play().catch(()=>{}) } catch {}
    }

    // 2) Assinatura SEM filtro e filtragem no cliente (evita perdas)
    try { get()._inviteChannel?.unsubscribe() } catch {}
    const ch = supabase
      .channel('calls-invites-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'video_calls' },
        (payload) => {
          const row: any = payload.new
          if (row.receiver_id !== userId) return
          if (row.status === 'calling') {
            set({
              incoming: { call_id: row.id, caller_id: row.caller_id, call_type: row.call_type as CallType },
              status: 'ringing',
            })
            try { const a = new Audio('/sounds/ringtone.mp3'); a.loop = true; a.play().catch(()=>{}) } catch {}
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'video_calls' },
        (payload) => {
          const row: any = payload.new
          if (row.receiver_id !== userId) return
          if (row.status === 'calling') {
            set({
              incoming: { call_id: row.id, caller_id: row.caller_id, call_type: row.call_type as CallType },
              status: 'ringing',
            })
          }
        },
      )
      .subscribe()
    set({ _inviteChannel: ch })
  },

  clear() {
    try { get()._inviteChannel?.unsubscribe() } catch {}
    try { get()._callChannel?.unsubscribe() } catch {}
    set({ status: 'idle', incoming: null, callId: undefined, currentRoomId: undefined })
  },
}))
