import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface NotificationSettings {
  message_sound_url?: string;
  attention_sound_url?: string;
}

export const useNotificationSounds = () => {
  const [settings, setSettings] = useState<NotificationSettings>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load user notification settings
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('message_sound_url, attention_sound_url')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setSettings(data || {});
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload sound file
  const uploadSound = useCallback(async (file: File, type: 'message' | 'attention') => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-sound-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('notification-sounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('notification-sounds')
        .getPublicUrl(fileName);

      // Update user settings
      await updateSoundSetting(type, publicUrl);
      
      toast.success(`Som de ${type === 'message' ? 'mensagem' : 'atenção'} atualizado!`);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading sound:', error);
      toast.error('Erro ao fazer upload do som');
      return null;
    }
  }, [user]);

  // Update sound setting
  const updateSoundSetting = async (type: 'message' | 'attention', soundUrl: string) => {
    try {
      const updateData = type === 'message' 
        ? { message_sound_url: soundUrl }
        : { attention_sound_url: soundUrl };

      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user?.id,
          ...updateData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      setSettings(prev => ({ ...prev, ...updateData }));
    } catch (error) {
      console.error('Error updating sound setting:', error);
      throw error;
    }
  };

  // Play sound
  const playSound = useCallback((type: 'message' | 'attention', customUrl?: string) => {
    try {
      let soundUrl = customUrl;
      
      if (!soundUrl) {
        soundUrl = type === 'message' 
          ? settings.message_sound_url 
          : settings.attention_sound_url;
      }

      if (soundUrl) {
        const audio = new Audio(soundUrl);
        audio.volume = 0.5;
        audio.play().catch(console.error);
      } else {
        // Fallback to generated sound
        playGeneratedSound(type);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      playGeneratedSound(type);
    }
  }, [settings]);

  // Generate sound programmatically as fallback
  const playGeneratedSound = (type: 'message' | 'attention') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'message') {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      } else {
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing generated sound:', error);
    }
  };

  return {
    settings,
    loading,
    uploadSound,
    playSound,
    updateSoundSetting
  };
};