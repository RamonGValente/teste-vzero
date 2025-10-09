export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appearance_settings: {
        Row: {
          accent_color: string | null
          animation_speed: string | null
          compact_mode: boolean | null
          created_at: string
          font_family: string | null
          high_contrast: boolean | null
          id: string
          large_text: boolean | null
          reduce_motion: boolean | null
          show_avatars: boolean | null
          sidebar_position: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          animation_speed?: string | null
          compact_mode?: boolean | null
          created_at?: string
          font_family?: string | null
          high_contrast?: boolean | null
          id?: string
          large_text?: boolean | null
          reduce_motion?: boolean | null
          show_avatars?: boolean | null
          sidebar_position?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          animation_speed?: string | null
          compact_mode?: boolean | null
          created_at?: string
          font_family?: string | null
          high_contrast?: boolean | null
          id?: string
          large_text?: boolean | null
          reduce_motion?: boolean | null
          show_avatars?: boolean | null
          sidebar_position?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attention_call_limits: {
        Row: {
          created_at: string | null
          id: string
          last_call_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_call_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_call_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attention_calls: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attention_calls_receiver_id_profiles_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attention_calls_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_silence_settings: {
        Row: {
          created_at: string | null
          id: string
          sender_id: string
          silenced_until: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sender_id: string
          silenced_until: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sender_id?: string
          silenced_until?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_contacts: {
        Row: {
          blocked_user_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_contacts_blocked_user_id_profiles_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_contacts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_settings: {
        Row: {
          auto_answer: boolean | null
          auto_answer_delay: number | null
          call_recording: boolean | null
          call_waiting: boolean | null
          created_at: string
          echo_cancellation: boolean | null
          id: string
          noise_cancellation: boolean | null
          ringtone: string | null
          show_caller_id: boolean | null
          speaker_boost: boolean | null
          updated_at: string
          user_id: string
          vibrate_on_call: boolean | null
        }
        Insert: {
          auto_answer?: boolean | null
          auto_answer_delay?: number | null
          call_recording?: boolean | null
          call_waiting?: boolean | null
          created_at?: string
          echo_cancellation?: boolean | null
          id?: string
          noise_cancellation?: boolean | null
          ringtone?: string | null
          show_caller_id?: boolean | null
          speaker_boost?: boolean | null
          updated_at?: string
          user_id: string
          vibrate_on_call?: boolean | null
        }
        Update: {
          auto_answer?: boolean | null
          auto_answer_delay?: number | null
          call_recording?: boolean | null
          call_waiting?: boolean | null
          created_at?: string
          echo_cancellation?: boolean | null
          id?: string
          noise_cancellation?: boolean | null
          ringtone?: string | null
          show_caller_id?: boolean | null
          speaker_boost?: boolean | null
          updated_at?: string
          user_id?: string
          vibrate_on_call?: boolean | null
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          auto_delete_days: number | null
          auto_delete_messages: boolean | null
          backup_enabled: boolean | null
          backup_frequency: string | null
          chat_theme: string | null
          created_at: string
          emoji_suggestions: boolean | null
          enable_message_stars: boolean | null
          enter_to_send: boolean | null
          font_size: string | null
          id: string
          quick_replies_enabled: boolean | null
          show_read_receipts: boolean | null
          show_timestamps: boolean | null
          updated_at: string
          user_id: string
          wallpaper: string | null
        }
        Insert: {
          auto_delete_days?: number | null
          auto_delete_messages?: boolean | null
          backup_enabled?: boolean | null
          backup_frequency?: string | null
          chat_theme?: string | null
          created_at?: string
          emoji_suggestions?: boolean | null
          enable_message_stars?: boolean | null
          enter_to_send?: boolean | null
          font_size?: string | null
          id?: string
          quick_replies_enabled?: boolean | null
          show_read_receipts?: boolean | null
          show_timestamps?: boolean | null
          updated_at?: string
          user_id: string
          wallpaper?: string | null
        }
        Update: {
          auto_delete_days?: number | null
          auto_delete_messages?: boolean | null
          backup_enabled?: boolean | null
          backup_frequency?: string | null
          chat_theme?: string | null
          created_at?: string
          emoji_suggestions?: boolean | null
          enable_message_stars?: boolean | null
          enter_to_send?: boolean | null
          font_size?: string | null
          id?: string
          quick_replies_enabled?: boolean | null
          show_read_receipts?: boolean | null
          show_timestamps?: boolean | null
          updated_at?: string
          user_id?: string
          wallpaper?: string | null
        }
        Relationships: []
      }
      contact_invitations: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_invitations_receiver_id_profiles_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_invitations_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_contact_id_profiles_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_messages: {
        Row: {
          deleted_at: string | null
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      general_settings: {
        Row: {
          app_lock: boolean | null
          auto_correct: boolean | null
          created_at: string
          date_format: string | null
          fingerprint_unlock: boolean | null
          haptic_feedback: boolean | null
          id: string
          keyboard_type: string | null
          language: string | null
          predictive_text: boolean | null
          region: string | null
          spell_check: boolean | null
          time_format: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_lock?: boolean | null
          auto_correct?: boolean | null
          created_at?: string
          date_format?: string | null
          fingerprint_unlock?: boolean | null
          haptic_feedback?: boolean | null
          id?: string
          keyboard_type?: string | null
          language?: string | null
          predictive_text?: boolean | null
          region?: string | null
          spell_check?: boolean | null
          time_format?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_lock?: boolean | null
          auto_correct?: boolean | null
          created_at?: string
          date_format?: string | null
          fingerprint_unlock?: boolean | null
          haptic_feedback?: boolean | null
          id?: string
          keyboard_type?: string | null
          language?: string | null
          predictive_text?: boolean | null
          region?: string | null
          spell_check?: boolean | null
          time_format?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_files: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          message_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          message_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          auto_delete_at: string | null
          content: string
          created_at: string | null
          delivered_at: string | null
          expires_at: string | null
          file_url: string | null
          id: string
          is_encrypted: boolean | null
          message_type: string | null
          receiver_id: string
          sender_id: string
          single_view: boolean | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          auto_delete_at?: string | null
          content: string
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          is_encrypted?: boolean | null
          message_type?: string | null
          receiver_id: string
          sender_id: string
          single_view?: boolean | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          auto_delete_at?: string | null
          content?: string
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          is_encrypted?: boolean | null
          message_type?: string | null
          receiver_id?: string
          sender_id?: string
          single_view?: boolean | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_profiles_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          calls_enabled: boolean | null
          calls_sound: boolean | null
          calls_vibration: boolean | null
          created_at: string
          do_not_disturb: boolean | null
          groups_enabled: boolean | null
          groups_preview: boolean | null
          groups_sound: boolean | null
          groups_vibration: boolean | null
          high_priority_only: boolean | null
          id: string
          messages_enabled: boolean | null
          messages_preview: boolean | null
          messages_sound: boolean | null
          messages_vibration: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_enabled?: boolean | null
          calls_sound?: boolean | null
          calls_vibration?: boolean | null
          created_at?: string
          do_not_disturb?: boolean | null
          groups_enabled?: boolean | null
          groups_preview?: boolean | null
          groups_sound?: boolean | null
          groups_vibration?: boolean | null
          high_priority_only?: boolean | null
          id?: string
          messages_enabled?: boolean | null
          messages_preview?: boolean | null
          messages_sound?: boolean | null
          messages_vibration?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_enabled?: boolean | null
          calls_sound?: boolean | null
          calls_vibration?: boolean | null
          created_at?: string
          do_not_disturb?: boolean | null
          groups_enabled?: boolean | null
          groups_preview?: boolean | null
          groups_sound?: boolean | null
          groups_vibration?: boolean | null
          high_priority_only?: boolean | null
          id?: string
          messages_enabled?: boolean | null
          messages_preview?: boolean | null
          messages_sound?: boolean | null
          messages_vibration?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          about: string | null
          calls: string | null
          created_at: string
          groups: string | null
          id: string
          last_seen: string | null
          live_location: string | null
          online_status: boolean | null
          profile_photo: string | null
          read_receipts: boolean | null
          status: string | null
          typing_indicators: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          calls?: string | null
          created_at?: string
          groups?: string | null
          id?: string
          last_seen?: string | null
          live_location?: string | null
          online_status?: boolean | null
          profile_photo?: string | null
          read_receipts?: boolean | null
          status?: string | null
          typing_indicators?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          calls?: string | null
          created_at?: string
          groups?: string | null
          id?: string
          last_seen?: string | null
          live_location?: string | null
          online_status?: boolean | null
          profile_photo?: string | null
          read_receipts?: boolean | null
          status?: string | null
          typing_indicators?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_seen: string | null
          status: string | null
          updated_at: string | null
          user_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_code?: string | null
        }
        Relationships: []
      }
      storage_settings: {
        Row: {
          auto_download_audio: string | null
          auto_download_documents: string | null
          auto_download_photos: string | null
          auto_download_videos: string | null
          backup_enabled: boolean | null
          backup_frequency: string | null
          backup_include_videos: boolean | null
          compress_media: boolean | null
          created_at: string
          delete_old_media: boolean | null
          id: string
          media_quality: string | null
          old_media_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_download_audio?: string | null
          auto_download_documents?: string | null
          auto_download_photos?: string | null
          auto_download_videos?: string | null
          backup_enabled?: boolean | null
          backup_frequency?: string | null
          backup_include_videos?: boolean | null
          compress_media?: boolean | null
          created_at?: string
          delete_old_media?: boolean | null
          id?: string
          media_quality?: string | null
          old_media_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_download_audio?: string | null
          auto_download_documents?: string | null
          auto_download_photos?: string | null
          auto_download_videos?: string | null
          backup_enabled?: boolean | null
          backup_frequency?: string | null
          backup_include_videos?: boolean | null
          compress_media?: boolean | null
          created_at?: string
          delete_old_media?: boolean | null
          id?: string
          media_quality?: string | null
          old_media_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      typing_status: {
        Row: {
          contact_id: string
          id: string
          is_typing: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          id?: string
          is_typing?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          id?: string
          is_typing?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          created_at: string | null
          id: string
          session_end: string | null
          session_start: string | null
          total_minutes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          total_minutes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          total_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          attention_sound_url: string | null
          created_at: string | null
          id: string
          message_sound_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attention_sound_url?: string | null
          created_at?: string | null
          id?: string
          message_sound_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attention_sound_url?: string | null
          created_at?: string | null
          id?: string
          message_sound_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_old_attention_calls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_contacts_ranking: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          contact_count: number
          full_name: string
          status: string
          user_id: string
        }[]
      }
      update_typing_status: {
        Args: { contact_user_id: string; typing: boolean }
        Returns: undefined
      }
      update_user_status: {
        Args: { new_status: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
