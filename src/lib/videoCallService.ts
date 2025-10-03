import { supabase } from "@/lib/supabase";

export async function createCall(params: { callerId: string; receiverId: string; roomId: string; type: 'video'|'audio' }) {
  const { data, error } = await supabase.from('video_calls').insert({
    caller_id: params.callerId,
    receiver_id: params.receiverId,
    room_id: params.roomId,
    status: 'calling',
    call_type: params.type
  }).select().single();
  if (error) throw error;
  return data;
}
