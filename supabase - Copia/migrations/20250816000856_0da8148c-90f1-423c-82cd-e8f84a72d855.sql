-- Create settings tables for WhatsApp-like configuration

-- Privacy settings table
CREATE TABLE public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TEXT DEFAULT 'contacts' CHECK (last_seen IN ('everyone', 'contacts', 'nobody')),
  profile_photo TEXT DEFAULT 'contacts' CHECK (profile_photo IN ('everyone', 'contacts', 'nobody')),
  about TEXT DEFAULT 'contacts' CHECK (about IN ('everyone', 'contacts', 'nobody')),
  status TEXT DEFAULT 'contacts' CHECK (status IN ('everyone', 'contacts', 'nobody')),
  read_receipts BOOLEAN DEFAULT true,
  typing_indicators BOOLEAN DEFAULT true,
  online_status BOOLEAN DEFAULT true,
  live_location TEXT DEFAULT 'contacts' CHECK (live_location IN ('everyone', 'contacts', 'nobody')),
  groups TEXT DEFAULT 'contacts' CHECK (groups IN ('everyone', 'contacts', 'nobody')),
  calls TEXT DEFAULT 'contacts' CHECK (calls IN ('everyone', 'contacts', 'nobody')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages_enabled BOOLEAN DEFAULT true,
  messages_sound BOOLEAN DEFAULT true,
  messages_vibration BOOLEAN DEFAULT true,
  messages_preview BOOLEAN DEFAULT true,
  groups_enabled BOOLEAN DEFAULT true,
  groups_sound BOOLEAN DEFAULT true,
  groups_vibration BOOLEAN DEFAULT true,
  groups_preview BOOLEAN DEFAULT true,
  calls_enabled BOOLEAN DEFAULT true,
  calls_sound BOOLEAN DEFAULT true,
  calls_vibration BOOLEAN DEFAULT true,
  do_not_disturb BOOLEAN DEFAULT false,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '07:00',
  high_priority_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Storage settings table
CREATE TABLE public.storage_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_download_photos TEXT DEFAULT 'wifi' CHECK (auto_download_photos IN ('always', 'wifi', 'never')),
  auto_download_videos TEXT DEFAULT 'wifi' CHECK (auto_download_videos IN ('always', 'wifi', 'never')),
  auto_download_audio TEXT DEFAULT 'always' CHECK (auto_download_audio IN ('always', 'wifi', 'never')),
  auto_download_documents TEXT DEFAULT 'wifi' CHECK (auto_download_documents IN ('always', 'wifi', 'never')),
  media_quality TEXT DEFAULT 'high' CHECK (media_quality IN ('high', 'medium', 'low')),
  backup_enabled BOOLEAN DEFAULT true,
  backup_frequency TEXT DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
  backup_include_videos BOOLEAN DEFAULT true,
  compress_media BOOLEAN DEFAULT false,
  delete_old_media BOOLEAN DEFAULT false,
  old_media_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Chat settings table
CREATE TABLE public.chat_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallpaper TEXT DEFAULT 'default',
  font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  chat_theme TEXT DEFAULT 'default' CHECK (chat_theme IN ('default', 'dark', 'colorful')),
  show_timestamps BOOLEAN DEFAULT true,
  show_read_receipts BOOLEAN DEFAULT true,
  enable_message_stars BOOLEAN DEFAULT true,
  auto_delete_messages BOOLEAN DEFAULT false,
  auto_delete_days INTEGER DEFAULT 30,
  backup_enabled BOOLEAN DEFAULT true,
  backup_frequency TEXT DEFAULT 'weekly' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
  enter_to_send BOOLEAN DEFAULT true,
  emoji_suggestions BOOLEAN DEFAULT true,
  quick_replies_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Call settings table
CREATE TABLE public.call_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ringtone TEXT DEFAULT 'default',
  call_waiting BOOLEAN DEFAULT true,
  show_caller_id BOOLEAN DEFAULT true,
  vibrate_on_call BOOLEAN DEFAULT true,
  auto_answer BOOLEAN DEFAULT false,
  auto_answer_delay INTEGER DEFAULT 5,
  call_recording BOOLEAN DEFAULT false,
  noise_cancellation BOOLEAN DEFAULT true,
  echo_cancellation BOOLEAN DEFAULT true,
  speaker_boost BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- General settings table
CREATE TABLE public.general_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'pt-BR',
  region TEXT DEFAULT 'BR',
  date_format TEXT DEFAULT 'dd/mm/yyyy',
  time_format TEXT DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
  keyboard_type TEXT DEFAULT 'default',
  auto_correct BOOLEAN DEFAULT true,
  spell_check BOOLEAN DEFAULT true,
  predictive_text BOOLEAN DEFAULT true,
  haptic_feedback BOOLEAN DEFAULT true,
  app_lock BOOLEAN DEFAULT false,
  fingerprint_unlock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Appearance settings table
CREATE TABLE public.appearance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  accent_color TEXT DEFAULT 'blue',
  font_family TEXT DEFAULT 'system',
  animation_speed TEXT DEFAULT 'normal' CHECK (animation_speed IN ('slow', 'normal', 'fast')),
  reduce_motion BOOLEAN DEFAULT false,
  high_contrast BOOLEAN DEFAULT false,
  large_text BOOLEAN DEFAULT false,
  show_avatars BOOLEAN DEFAULT true,
  compact_mode BOOLEAN DEFAULT false,
  sidebar_position TEXT DEFAULT 'left' CHECK (sidebar_position IN ('left', 'right')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all settings tables
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appearance_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all settings tables
CREATE POLICY "Users can view their own privacy settings" ON public.privacy_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own privacy settings" ON public.privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own privacy settings" ON public.privacy_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own privacy settings" ON public.privacy_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification settings" ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notification settings" ON public.notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notification settings" ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notification settings" ON public.notification_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own storage settings" ON public.storage_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own storage settings" ON public.storage_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own storage settings" ON public.storage_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own storage settings" ON public.storage_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own chat settings" ON public.chat_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chat settings" ON public.chat_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat settings" ON public.chat_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat settings" ON public.chat_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own call settings" ON public.call_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own call settings" ON public.call_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own call settings" ON public.call_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own call settings" ON public.call_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own general settings" ON public.general_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own general settings" ON public.general_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own general settings" ON public.general_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own general settings" ON public.general_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own appearance settings" ON public.appearance_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own appearance settings" ON public.appearance_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own appearance settings" ON public.appearance_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own appearance settings" ON public.appearance_settings FOR DELETE USING (auth.uid() = user_id);

-- Create update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON public.privacy_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_storage_settings_updated_at BEFORE UPDATE ON public.storage_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_settings_updated_at BEFORE UPDATE ON public.chat_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_call_settings_updated_at BEFORE UPDATE ON public.call_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_general_settings_updated_at BEFORE UPDATE ON public.general_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appearance_settings_updated_at BEFORE UPDATE ON public.appearance_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();