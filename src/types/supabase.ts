// src/types/supabase.ts
// Generated manually from the schema you provided (subset of tables)
// This allows intellisense and safer queries via supabase-js.
export type UUID = string;

export interface Profiles {
  Row: {
    id: UUID;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    status: string | null;
    user_code: string | null;
    last_seen: string | null; // ISO
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id: UUID;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    status?: string | null;
    user_code?: string | null;
    last_seen?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: Partial<Profiles["Insert"]>;
}

export interface Messages {
  Row: {
    id: UUID;
    sender_id: UUID;
    receiver_id: UUID;
    content: string;
    message_type: string | null;
    file_url: string | null;
    is_encrypted: boolean | null;
    single_view: boolean | null;
    expires_at: string | null;
    auto_delete_at: string | null;
    viewed_at: string | null;
    delivered_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: UUID;
    sender_id: UUID;
    receiver_id: UUID;
    content: string;
    message_type?: string | null;
    file_url?: string | null;
    is_encrypted?: boolean | null;
    single_view?: boolean | null;
    expires_at?: string | null;
    auto_delete_at?: string | null;
    viewed_at?: string | null;
    delivered_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: Partial<Messages["Insert"]>;
}

export interface Tables {
  profiles: Profiles;
  messages: Messages;
}

export type TableName = keyof Tables;
