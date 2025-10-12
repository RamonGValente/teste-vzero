import { supabase } from '../../../config/supabase';
import { PostComment, CreateCommentRequest } from '../models/types';

export class CommentService {
  // Adicionar comentário a uma postagem aprovada
  static async addComment(postId: string, userId: string, commentData: CreateCommentRequest): Promise<PostComment> {
    const { data: post, error: postErr } = await supabase
      .from('social_posts')
      .select('status')
      .eq('id', postId)
      .single();

    if (postErr) throw new Error(postErr.message);
    if (!post) throw new Error('Post not found');
    if (post.status !== 'approved') throw new Error('Cannot comment on unapproved post');

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: commentData.content,
      })
      .select(`
        *,
        user_profile:profiles(full_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(`Error adding comment: ${error.message}`);
    return comment as PostComment;
  }

  // Buscar comentários de uma postagem
  static async getCommentsByPost(postId: string, options: { page?: number; limit?: number } = {}): Promise<{ comments: PostComment[]; total: number }> {
    const { page = 1, limit = 50 } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: comments, error, count } = await supabase
      .from('post_comments')
      .select(`
        *,
        user_profile:profiles(full_name, avatar_url)
      `, { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Error fetching comments: ${error.message}`);

    return { comments: (comments || []) as PostComment[], total: count || 0 };
  }

  // Editar comentário (autor)
  static async updateComment(commentId: string, userId: string, content: string): Promise<PostComment> {
    const { data: comment, error } = await supabase
      .from('post_comments')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', userId)
      .select(`
        *,
        user_profile:profiles(full_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(`Error updating comment: ${error.message}`);
    return comment as PostComment;
  }

  // Deletar comentário (autor)
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw new Error(`Error deleting comment: ${error.message}`);
  }
}
