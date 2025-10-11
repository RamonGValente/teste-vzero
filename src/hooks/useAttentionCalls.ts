import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

type AttentionCall = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  viewed_at: string | null;
  created_at: string;
};

export const useAttentionCalls = () => {
  const [attentionCalls, setAttentionCalls] = useState<AttentionCall[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    void loadAttentionCalls();
    const unsub = subscribe(user.id);
    return () => { unsub?.(); };
  }, [user?.id]);

  const loadAttentionCalls = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('attention_calls')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setAttentionCalls((data || []) as AttentionCall[]);
    } catch (e) {
      console.error('Error loading attention calls:', e);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = (uid: string) => {
    const ch = supabase
      .channel('attention_calls_list_v6')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attention_calls', filter: `receiver_id=eq.${uid}` },
        (payload) => setAttentionCalls(prev => [payload.new as AttentionCall, ...prev].slice(0, 20))
      )
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  };

  const checkCallLimit = async (): Promise<boolean> => {
    try {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('attention_call_limits')
        .select('last_call_at')
        .eq('user_id', user?.id)
        .gte('last_call_at', cutoff)
        .maybeSingle();
      if (error && (error as any).code !== 'PGRST116') throw error;
      return !data; // true se NÃO houve chamada nos últimos 5 min
    } catch (e) {
      console.error('Error checking call limit:', e);
      return false;
    }
  };

  const checkOnline = async (contactId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('status,last_seen')
        .eq('id', contactId)
        .maybeSingle();

      const last = data?.last_seen ? new Date(data.last_seen).getTime() : 0;
      const online = (data?.status === 'online') || (last && Date.now() - last < 70_000);
      return online;
    } catch {
      return false;
    }
  };

  const updateCallLimit = async () => {
    try {
      const { error } = await supabase
        .from('attention_call_limits')
        .upsert(
          { user_id: user?.id, last_call_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    } catch (e) {
      console.error('Error updating call limit:', e);
    }
  };

  // Broadcast instantâneo para o destinatário
  const broadcastAttention = async (receiverId: string, payload: { sender_id: string; message: string; created_at: string }) => {
    const ch = supabase.channel(`attention_user_${receiverId}`, { config: { broadcast: { self: false } } });
    const status = await ch.subscribe();
    if (status === 'SUBSCRIBED') {
      await ch.send({ type: 'broadcast', event: 'attention', payload });
    }
    // encerra o canal após enviar
    setTimeout(() => { try { supabase.removeChannel(ch); } catch {} }, 300);
  };

  const callAttention = async (contactId: string) => {
    if (!user?.id) return;

    const ok = await checkCallLimit();
    if (!ok) {
      toast.error('Você só pode chamar atenção a cada 5 minutos');
      return;
    }

    const online = await checkOnline(contactId);
    if (!online) {
      toast.error('O contato está offline agora');
      return;
    }

    // Nome do remetente
    let myName = 'Alguém';
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.full_name) myName = data.full_name;
    } catch {}

    try {
      // 1) grava no banco (histórico)
      const { error } = await supabase
        .from('attention_calls')
        .insert({
          sender_id: user.id,
          receiver_id: contactId,
          message: myName,
        });
      if (error) throw error;

      // 2) broadcast imediato (chega mesmo sem publication)
      await broadcastAttention(contactId, {
        sender_id: user.id,
        message: myName,
        created_at: new Date().toISOString(),
      });

      await updateCallLimit();
      toast.success('Atenção enviada!');
    } catch (e) {
      console.error('Error calling attention:', e);
      toast.error('Erro ao chamar atenção');
    }
  };

  const silenceNotifications = async (contactId: string, duration: number) => {
    try {
      const silencedUntil = new Date(Date.now() + duration).toISOString();
      const { error } = await supabase
        .from('attention_silence_settings')
        .upsert(
          { user_id: user?.id, sender_id: contactId, silenced_until: silencedUntil },
          { onConflict: 'user_id,sender_id' }
        );
      if (error) throw error;
      toast.success('Notificações silenciadas');
    } catch (e) {
      console.error('Error silencing notifications:', e);
      toast.error('Erro ao silenciar notificações');
    }
  };

  return { attentionCalls, loading, callAttention, silenceNotifications };
};
