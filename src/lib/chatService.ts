// src/lib/chatService.ts
import { supabase } from "./supabaseClient";
import type { Messages } from "@/types/supabase";

export async function sendMessage(input: Messages["Insert"]) {
  const { data, error } = await supabase
    .from("messages")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as Messages["Row"];
}

export async function getConversation(myId: string, otherId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Messages["Row"][];
}
