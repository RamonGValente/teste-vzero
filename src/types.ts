export type UUID = string
export type Message = { id: UUID; sender_id: UUID; receiver_id: UUID; content: string; created_at: string }
export type ConversationPeer = { id: UUID; full_name?: string|null; email?: string|null; avatar_url?: string|null }
