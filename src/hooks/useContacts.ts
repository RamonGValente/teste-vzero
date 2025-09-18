
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export const useContacts = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadContacts();
      subscribeToContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          profiles!contacts_contact_id_profiles_fkey(*)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToContacts = () => {
    const subscription = supabase
      .channel('contacts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadContacts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const addContact = async (email: string) => {
    try {
      // First, find the user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        toast.error('Usuário não encontrado');
        return;
      }

      // Check if it's not the same user
      if (profile.id === user?.id) {
        toast.error('Você não pode adicionar a si mesmo');
        return;
      }

      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('contact_id', profile.id)
        .single();

      if (existingContact) {
        toast.error('Contato já adicionado');
        return;
      }

      // Add contact
      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: user?.id,
          contact_id: profile.id,
        });

      if (error) throw error;
      toast.success('Contato adicionado com sucesso');
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Erro ao adicionar contato');
    }
  };

  const removeContact = async (contactId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id)
        .eq('contact_id', contactId);

      if (error) throw error;
      toast.success('Contato removido');
    } catch (error) {
      console.error('Error removing contact:', error);
      toast.error('Erro ao remover contato');
    }
  };

  return {
    contacts,
    loading,
    addContact,
    removeContact,
  };
};
