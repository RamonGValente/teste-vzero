import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ContactRanking {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  contact_count: number;
  status?: string;
}

export const useContactRanking = () => {
  const [rankings, setRankings] = useState<ContactRanking[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContactRanking = async () => {
    setLoading(true);
    try {
      // Call the updated function that returns contact count ranking
      const { data, error } = await supabase.rpc('get_contacts_ranking');

      if (error) throw error;

      const rankings = data?.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.full_name || 'Usuário',
        avatar_url: item.avatar_url,
        contact_count: parseInt(item.contact_count) || 0,
        status: item.status
      })) || [];

      setRankings(rankings);
    } catch (error) {
      console.error('Error loading contact ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactRanking();
  }, []);

  return {
    rankings,
    loading,
    refreshRanking: loadContactRanking
  };
};