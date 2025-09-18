import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

export const useTypingStatus = (contactId?: string) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuth();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to typing status changes
  useEffect(() => {
    if (!contactId || !user) return;

    const subscription = supabase
      .channel('typing_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          // Quando alguém está digitando para MIM, o contact_id é o MEU id
          filter: `contact_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { user_id, is_typing } = payload.new as { user_id: string; is_typing: boolean };
            setTypingUsers((prev) => {
              const filtered = prev.filter((id) => id !== user_id);
              return is_typing ? [...filtered, user_id] : filtered;
            });
          } else if (payload.eventType === 'DELETE') {
            const { user_id } = payload.old as { user_id: string };
            setTypingUsers((prev) => prev.filter((id) => id !== user_id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [contactId, user]);

  // Atualiza o status de digitação diretamente na tabela (UPDATE -> INSERT fallback)
  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (!contactId || !user) return;

    try {
      // tenta atualizar linha existente
      const { data: updated, error: upErr } = await supabase
        .from('typing_status')
        .update({ is_typing: typing, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .select('id');

      if (upErr) throw upErr;

      // se não atualizou nenhuma linha, insere
      if (!updated || updated.length === 0) {
        const { error: insErr } = await supabase
          .from('typing_status')
          .insert({
            user_id: user.id,
            contact_id: contactId,
            is_typing: typing,
            updated_at: new Date().toISOString(),
          });

        if (insErr) throw insErr;
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [contactId, user]);

  // Inicia digitação
  const startTyping = useCallback(() => {
    if (isTyping) return;

    setIsTyping(true);
    updateTypingStatus(true);

    // limpa timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // para de digitar após 3s sem atividade
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 3000);
  }, [isTyping, updateTypingStatus]);

  // Para digitação manualmente
  const stopTyping = useCallback(() => {
    if (!isTyping) return;

    setIsTyping(false);
    updateTypingStatus(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isTyping, updateTypingStatus]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isTyping) {
        updateTypingStatus(false);
      }
    };
  }, [isTyping, updateTypingStatus]);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
  };
};
