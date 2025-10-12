import { supabase } from '../../../config/supabase';
import { SocialPost, CreatePostRequest } from '../models/types';
import { MentionService } from './MentionService';

export class SocialPostService {
  // Criar nova postagem
  static async createPost(userId: string, postData: CreatePostRequest): Promise<SocialPost> {
    const mentions = MentionService.extractMentions(postData.content);
    const { valid: validMentions } = await MentionService.validateMentions(mentions);

    const expires = postData.expires_at
      ? new Date(postData.expires_at as any)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h padrão

    const { data: post, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: userId,
        content: postData.content,
        image_url: postData.image_url,
        mentions: validMentions,
        expires_at: expires.toISOString(),
        status: 'pending',
      })
      .select(`
        *,
        user_profile:profiles!social_posts_user_id_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(`Error creating post: ${error.message}`);

    if (validMentions.length > 0) {
      await MentionService.notifyMentionedUsers(validMentions, post.id, userId);
    }

    return post as SocialPost;
  }

  // Aprovar postagem
  static async approvePost(postId: string, approvedBy: string): Promise<SocialPost> {
    const { data: existingPost, error: getErr } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (getErr) throw new Error(getErr.message);
    if (!existingPost) throw new Error('Post not found');
    if (existingPost.status !== 'pending') throw new Error('Post already processed');

    const newContent: string = (existingPost.content || '').replace('⏰ EXPIRADO ✅', 'APROVADA✅');

    const { data: post, error } = await supabase
      .from('social_posts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        content: newContent,
      })
      .eq('id', postId)
      .select(`
        *,
        user_profile:profiles!social_posts_user_id_fkey(full_name, avatar_url),
        approved_by_profile:profiles!social_posts_approved_by_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(`Error approving post: ${error.message}`);

    // Snapshot do histórico de aprovação
    await supabase.from('post_approvals').insert({ post_id: postId, user_id: approvedBy, approved: true });

    return post as SocialPost;
  }

  // Rejeitar postagem
  static async rejectPost(postId: string, rejectedBy: string): Promise<SocialPost> {
    const { data: post, error } = await supabase
      .from('social_posts')
      .update({
        status: 'rejected',
        approved_by: rejectedBy,
      })
      .eq('id', postId)
      .select(`
        *,
        user_profile:profiles!social_posts_user_id_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(`Error rejecting post: ${error.message}`);
    return post as SocialPost;
  }

  // Buscar postagens com filtros
  static async getPosts(options: { status?: string; userId?: string; page?: number; limit?: number } = {}): Promise<{ posts: SocialPost[]; total: number }> {
    const { status, userId, page = 1, limit = 20 } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('social_posts')
      .select(`
        *,
        user_profile:profiles!social_posts_user_id_fkey(full_name, avatar_url),
        approved_by_profile:profiles!social_posts_approved_by_fkey(full_name, avatar_url),
        post_comments(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);

    const { data: posts, error, count } = await query.range(from, to);
    if (error) throw new Error(`Error fetching posts: ${error.message}`);

    return { posts: (posts || []) as SocialPost[], total: count || 0 };
  }

  // Buscar postagem por ID
  static async getPostById(postId: string): Promise<SocialPost> {
    const { data: post, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        user_profile:profiles!social_posts_user_id_fkey(full_name, avatar_url),
        approved_by_profile:profiles!social_posts_approved_by_fkey(full_name, avatar_url)
      `)
      .eq('id', postId)
      .single();

    if (error) throw new Error(`Error fetching post: ${error.message}`);
    if (!post) throw new Error('Post not found');
    return post as SocialPost;
  }

  // Verificar e atualizar postagens expiradas (RPC)
  static async checkExpiredPosts(): Promise<void> {
    const { error } = await supabase.rpc('mark_expired_posts');
    if (error) {
      console.error('Error updating expired posts:', error);
    }
  }
}
