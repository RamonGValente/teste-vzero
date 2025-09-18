import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

export const useAIAssistant = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const generateReplySuggestions = async (lastMessage: string, context: string[] = []) => {
    if (!user) return { suggestions: [] };

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          action: 'suggest_replies',
          content: lastMessage,
          context: context.slice(-5) // Only last 5 messages for context
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating reply suggestions:', error);
      return { suggestions: [] };
    } finally {
      setLoading(false);
    }
  };

  const moderateContent = async (content: string) => {
    if (!user) return { approved: true, reason: null };

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          action: 'moderate_content',
          content
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error moderating content:', error);
      return { approved: true, reason: null };
    }
  };

  return {
    generateReplySuggestions,
    moderateContent,
    loading
  };
};