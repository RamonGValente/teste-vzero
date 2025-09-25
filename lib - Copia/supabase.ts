import { createClient } from "@supabase/supabase-js"

// ─────────────────────────────────────────────────────────
// In production you must set NEXT_PUBLIC_SUPABASE_URL
// and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.
// During v0 preview we fall back to a public demo project
// so the app doesn’t crash.
// ─────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co" // ⚠️ demo URL - replace in real use
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key" // ⚠️ demo key - replace in real use

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️  Supabase env vars missing. Using demo credentials. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "in your .env.local before going to production.",
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  status: "online" | "offline" | "busy"
  user_code: string
  created_at: string
  updated_at: string
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  message_type: "text" | "image" | "audio" | "alert" | "self_destruct"
  file_url: string | null
  file_name: string | null
  expires_at: string | null
  is_deleted: boolean
  deleted_for: string[] | null
  created_at: string
  sender?: Profile
}

export type Conversation = {
  id: string
  participant1_id: string
  participant2_id: string
  created_at: string
  updated_at: string
  participant1?: Profile
  participant2?: Profile
  last_message?: Message
}

export type Contact = {
  id: string
  user_id: string
  contact_id: string
  created_at: string
  contact?: Profile
}

export type TypingStatus = {
  id: string
  conversation_id: string
  user_id: string
  is_typing: boolean
  updated_at: string
  user?: Profile
}
