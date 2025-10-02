import { create } from 'zustand'

export type CallStatus = 'calling'|'accepted'|'declined'|'ended'|'cancelled'

export interface Invite {
  id: string
  from_user_id: string
  to_user_id: string
  room_name: string
  status: CallStatus
  created_at: string
}

interface CallState {
  invites: Invite[]
  upsertInvite: (v: Invite) => void
  removeInvite: (id: string) => void
  currentRoom?: string
  setCurrentRoom: (room?: string) => void
}

export const useCallStore = create<CallState>((set) => ({
  invites: [],
  upsertInvite: (v) => set((s) => {
    const i = s.invites.findIndex(x => x.id === v.id)
    if (i >= 0) { const copy = s.invites.slice(); copy[i] = v; return { invites: copy } }
    return { invites: [...s.invites, v] }
  }),
  removeInvite: (id) => set((s) => ({ invites: s.invites.filter(x => x.id !== id) })),
  currentRoom: undefined,
  setCurrentRoom: (room) => set({ currentRoom: room }),
}))
