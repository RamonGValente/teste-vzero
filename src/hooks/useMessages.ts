import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'];

export const useMessages = (contactId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const seenIdsRef = useRef<Set<string>>(new Set());

  const sameConversation = (m: Message) =>
    !!user &&
    !!contactId &&
    (
      (m.sender_id === user.id && m.receiver_id === contactId) ||
      (m.sender_id === contactId && m.receiver_id === user.id)
    );

  const safeAppend = (m: Message) => {
    if (!m?.id) return;
    if (!sameConversation(m)) return;
    if (seenIdsRef.current.has(m.id)) return;
    seenIdsRef.current.add(m.id);
    setMessages(prev => {
      const next = [...prev, m];
      next.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      return next;
    });
  };

  const safeUpdate = (m: Message) => {
    if (!m?.id) return;
    if (!sameConversation(m)) return;
    setMessages(prev => {
      const idx = prev.findIndex(x => x.id === m.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = m;
      next.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      return next;
    });
  };

  const removeById = (id?: string | null) => {
    if (!id) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    seenIdsRef.current.delete(id);
  };

  useEffect(() => {
    if (user && contactId) {
      loadMessages();
    } else {
      setMessages([]);
      seenIdsRef.current.clear();
    }
  }, [user, contactId]);

  // Realtime
  useEffect(() => {
    if (!user || !contactId) return;

    const channel = supabase
      .channel(`messages:pair:${user.id}:${contactId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message;
        if (!sameConversation(m)) return;
        safeAppend(m);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message;
        if (!sameConversation(m)) return;
        safeUpdate(m);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const oldRow = payload.old as Partial<Message>;
        if (oldRow?.id) removeById(oldRow.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, contactId]);

  const loadMessages = async () => {
    if (!user || !contactId) return;

    setLoading(true);
    try {
      const filter = `and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(filter) // <-- sem barras invertidas nas crases
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      seenIdsRef.current = new Set((data || []).map((d) => d.id));

      // marcar como lidas as mensagens recebidas
      await markMessagesAsViewed();
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (
    content: string,
    type: 'text' | 'image' | 'file' | 'audio' = 'text',
    fileUrl?: string
  ) => {
    if (!user || !contactId || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: contactId,
          content: content.trim(),
          message_type: type,
          file_url: fileUrl,
        })
        .select('*')
        .single();

      if (error) throw error;

      if (data) safeAppend(data as Message);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const markMessagesAsViewed = async () => {
    if (!user || !contactId) return;
    try {
      await supabase
        .from('messages')
        .update({
          viewed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 120000).toISOString(),
          auto_delete_at: new Date(Date.now() + 120000).toISOString(),
        })
        .eq('sender_id', contactId)
        .eq('receiver_id', user.id)
        .is('viewed_at', null);
    } catch (error) {
      console.error('Error marking messages as viewed:', error);
    }
  };

  const deleteMessage = async (messageId: string, deleteFor: 'me' | 'both' = 'me') => {
    if (!user) return;

    // otimista
    const prev = messages;
    removeById(messageId);

    if (deleteFor === 'both') {
      try {
        const { error } = await supabase.rpc('delete_message_for_both', { p_message_id: messageId });
        if (error) throw error;
        toast.success('Mensagem apagada para ambos');
        return;
      } catch (err) {
        console.error('RPC delete for both failed, falling back to sender-only delete:', err);
        // fallback continua abaixo
      }
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);
      if (error) throw error;
      toast.success('Mensagem deletada');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao deletar mensagem');
      setMessages(prev); // rollback
      await loadMessages();
    }
  };

  const markMediaAsViewed = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({
          viewed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 120000).toISOString(),
          auto_delete_at: new Date(Date.now() + 120000).toISOString(),
        })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking media as viewed:', error);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    markMediaAsViewed,
    refreshMessages: loadMessages,
  };
};
