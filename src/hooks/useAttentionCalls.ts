import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export const useAttentionCalls = () => {
  const [attentionCalls, setAttentionCalls] = useState<any[]>([]);
  const [lastIncoming, setLastIncoming] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionStartRef = useRef<Date>(new Date());
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    loadAttentionCalls();
    const unsubscribe = subscribeToAttentionCalls(user.id);
    return () => { try { unsubscribe?.(); } catch {} };
  }, [user?.id]);

  const loadAttentionCalls = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('attention_calls')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setAttentionCalls(data || []);
    } catch {
      setAttentionCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAttentionCalls = (receiverId: string) => {
    const ch = supabase
      .channel('attention_calls_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attention_calls', filter: `receiver_id=eq.${receiverId}` }, (payload) => {
        setAttentionCalls(prev => [payload.new, ...prev].slice(0, 10));
        const createdAt = new Date((payload.new as any)?.created_at ?? Date.now());
        if (createdAt < sessionStartRef.current) return;
        setLastIncoming(payload.new);
        toast.success('Contato está chamando sua atenção!', { duration: 2500 });
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  };

  const callAttention = async (contactId: string) => {
    if (!user?.id || !contactId) return;
    try {
      const { error } = await supabase.from('attention_calls').insert({ sender_id: user.id, receiver_id: contactId });
      if (error) throw error;
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('receiver is offline')) {
        
      } else {
        
      }
      throw e;
    }
  };

  return { attentionCalls, lastIncoming, loading, callAttention };
}
