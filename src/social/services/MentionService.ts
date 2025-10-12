import { supabase } from '../../../config/supabase';

export class MentionService {
  // Extrair menções do conteúdo (#nome_do_usuario)
  static extractMentions(content: string): string[] {
    const mentionRegex = /#([A-Za-z0-9_-]+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches.map((mention) => mention.substring(1)) : [];
  }

  // Validar se os usuários mencionados existem (usa profiles.user_code)
  static async validateMentions(mentions: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    if (mentions.length === 0) {
      return { valid: [], invalid: [] };
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_code')
      .in('user_code', mentions);

    if (error) {
      console.error('Error validating mentions:', error);
      return { valid: [], invalid: mentions };
    }

    const validMentions = profiles?.map((p) => p.user_code) || [];
    const invalidMentions = mentions.filter((m) => !validMentions.includes(m));
    return { valid: validMentions, invalid: invalidMentions };
  }

  // Substituir menções por uma marcação (opcional no backend; o frontend também faz)
  static formatMentions(content: string): string {
    return content.replace(/#([A-Za-z0-9_-]+)/g, '<span class="mention" data-user="$1">#$1</span>');
  }

  // Notificar usuários mencionados via attention_calls
  static async notifyMentionedUsers(mentionedUsers: string[], postId: string, mentionedBy: string) {
    for (const userCode of mentionedUsers) {
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_code', userCode)
        .single();

      if (user) {
        await supabase.from('attention_calls').insert({
          sender_id: mentionedBy,
          receiver_id: user.id,
          message: `Você foi mencionado em uma postagem (${postId}).`,
        });
      }
    }
  }
}
