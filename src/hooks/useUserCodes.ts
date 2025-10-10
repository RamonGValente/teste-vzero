
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export const useUserCodes = () => {
  const [userCode, setUserCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUserCode();
    }
  }, [user]);

  const generateUserCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const loadUserCode = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_code')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.user_code) {
        setUserCode(data.user_code);
      } else {
        // Generate and save a new code
        const newCode = generateUserCode();
        await updateUserCode(newCode);
      }
    } catch (error) {
      console.error('Error loading user code:', error);
    }
  };

  const updateUserCode = async (code: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_code: code })
        .eq('id', user?.id);

      if (error) throw error;
      setUserCode(code);
    } catch (error) {
      console.error('Error updating user code:', error);
      throw error;
    }
  };

  const addContactByCode = async (code: string) => {
    setLoading(true);
    try {
      // Find user by code
      const { data: contactProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, full_name, user_code')
        .eq('user_code', code.toUpperCase())
        .single();

      if (findError || !contactProfile) {
        toast.error('Código não encontrado');
        return false;
      }

      if (contactProfile.id === user?.id) {
        toast.error('Você não pode adicionar a si mesmo');
        return false;
      }

      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('contact_id', contactProfile.id)
        .single();

      if (existingContact) {
        toast.error('Contato já adicionado');
        return false;
      }

      // Add contact
      const { error: insertError } = await supabase
        .from('contacts')
        .insert([
          { user_id: user?.id, contact_id: contactProfile.id },
          { user_id: contactProfile.id, contact_id: user?.id }
        ]);

      if (insertError) throw insertError;

      toast.success(`Contato ${contactProfile.full_name} adicionado com sucesso!`);
      return true;
    } catch (error) {
      console.error('Error adding contact by code:', error);
      toast.error('Erro ao adicionar contato');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    userCode,
    loading,
    addContactByCode,
    generateNewCode: () => {
      const newCode = generateUserCode();
      updateUserCode(newCode);
    }
  };
};
