import { Request, Response } from 'express';
import { SocialPostService } from '../services/SocialPostService';
import { CreatePostRequest } from '../models/types';

export class SocialPostController {
  static async createPost(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const postData: CreatePostRequest = req.body;
      if (!userId) return res.status(401).json({ error: 'User not authenticated' });

      const post = await SocialPostService.createPost(userId, postData);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async approvePost(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;
      if (!userId) return res.status(401).json({ error: 'User not authenticated' });

      const post = await SocialPostService.approvePost(postId, userId);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async rejectPost(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;
      if (!userId) return res.status(401).json({ error: 'User not authenticated' });

      const post = await SocialPostService.rejectPost(postId, userId);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getPosts(req: Request, res: Response) {
    try {
      const { status, userId, page, limit } = req.query;
      const posts = await SocialPostService.getPosts({
        status: status as string,
        userId: userId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getPostById(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const post = await SocialPostService.getPostById(postId);
      res.json(post);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async checkExpiredPosts(req: Request, res: Response) {
    try {
      await SocialPostService.checkExpiredPosts();
      res.json({ message: 'Expired posts checked successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
