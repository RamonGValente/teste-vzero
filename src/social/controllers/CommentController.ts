import { Request, Response } from 'express';
import { CommentService } from '../services/CommentService';
import { CreateCommentRequest } from '../models/types';

export class CommentController {
  static async addComment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;
      const commentData: CreateCommentRequest = req.body;
      if (!userId) return res.status(401).json({ error: 'User not authenticated' });

      const comment = await CommentService.addComment(postId, userId, commentData);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getComments(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { page, limit } = req.query;
      const comments = await CommentService.getCommentsByPost(postId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(comments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateComment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { commentId } = req.params;
      const { content } = req.body;
      if (!userId) return res.status(401).json({ error: 'User not authenticated' });

      const comment = await CommentService.updateComment(commentId, userId, content);
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteComment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { commentId } = req.params;
      if (!userId) return res.status(401).json({ error: 'User not authenticated' });

      await CommentService.deleteComment(commentId, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
