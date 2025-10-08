
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export const useBlockedContacts = () => {
  const [blockedContacts, setBlockedContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadBlockedContacts();
    }
  }, [user]);

  const loadBlockedContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_contacts')
        .select(`
          *,
          profiles!blocked_contacts_blocked_user_id_profiles_fkey(*)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setBlockedContacts(data || []);
    } catch (error) {
      console.error('Error loading blocked contacts:', error);
      toast.error('Erro ao carregar contatos bloqueados');
    } finally {
      setLoading(false);
    }
  };

  const blockContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('blocked_contacts')
        .insert({
          user_id: user?.id,
          blocked_user_id: contactId,
        });

      if (error) throw error;
      
      // Remove from contacts
      await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user?.id)
        .eq('contact_id', contactId);

      await loadBlockedContacts();
      toast.success('Contato bloqueado');
    } catch (error) {
      console.error('Error blocking contact:', error);
      toast.error('Erro ao bloquear contato');
    }
  };

  const unblockContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('blocked_contacts')
        .delete()
        .eq('user_id', user?.id)
        .eq('blocked_user_id', contactId);

      if (error) throw error;
      await loadBlockedContacts();
      toast.success('Contato desbloqueado');
    } catch (error) {
      console.error('Error unblocking contact:', error);
      toast.error('Erro ao desbloquear contato');
    }
  };

  const isBlocked = (contactId: string) => {
    return blockedContacts.some(blocked => blocked.blocked_user_id === contactId);
  };

  return {
    blockedContacts,
    loading,
    blockContact,
    unblockContact,
    isBlocked,
  };
};
