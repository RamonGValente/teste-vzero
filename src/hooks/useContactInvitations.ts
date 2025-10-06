
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export const useContactInvitations = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadInvitations();
      subscribeToInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_invitations')
        .select(`
          *,
          sender:profiles!contact_invitations_sender_id_profiles_fkey(*),
          receiver:profiles!contact_invitations_receiver_id_profiles_fkey(*)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Erro ao carregar convites');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToInvitations = () => {
    const subscription = supabase
      .channel('contact_invitations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_invitations',
        },
        () => {
          loadInvitations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendInvitation = async (receiverEmail: string) => {
    try {
      // Find receiver by email
      const { data: receiverProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', receiverEmail)
        .single();

      if (profileError || !receiverProfile) {
        toast.error('Usuário não encontrado');
        return;
      }

      if (receiverProfile.id === user?.id) {
        toast.error('Você não pode enviar um convite para si mesmo');
        return;
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from('contact_invitations')
        .select('*')
        .eq('sender_id', user?.id)
        .eq('receiver_id', receiverProfile.id)
        .single();

      if (existingInvitation) {
        toast.error('Convite já enviado para este usuário');
        return;
      }

      // Check if they are already contacts
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('contact_id', receiverProfile.id)
        .single();

      if (existingContact) {
        toast.error('Este usuário já é seu contato');
        return;
      }

      // Send invitation
      const { error } = await supabase
        .from('contact_invitations')
        .insert({
          sender_id: user?.id,
          receiver_id: receiverProfile.id,
        });

      if (error) throw error;
      toast.success('Convite enviado com sucesso');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Erro ao enviar convite');
    }
  };

  const respondToInvitation = async (invitationId: string, response: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('contact_invitations')
        .update({ 
          status: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      // If accepted, create contact relationship
      if (response === 'accepted') {
        const invitation = invitations.find(inv => inv.id === invitationId);
        if (invitation) {
          // Add contact for both users
          await Promise.all([
            supabase.from('contacts').insert({
              user_id: invitation.receiver_id,
              contact_id: invitation.sender_id,
            }),
            supabase.from('contacts').insert({
              user_id: invitation.sender_id,
              contact_id: invitation.receiver_id,
            })
          ]);
        }
        toast.success('Convite aceito! Contato adicionado');
      } else {
        toast.success('Convite rejeitado');
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Erro ao responder convite');
    }
  };

  return {
    invitations,
    loading,
    sendInvitation,
    respondToInvitation,
  };
};
