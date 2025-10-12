import { Router } from 'express';
import { SocialPostController } from '../controllers/SocialPostController';
import { CommentController } from '../controllers/CommentController';

const router = Router();

// Posts
router.post('/posts', SocialPostController.createPost);
router.get('/posts', SocialPostController.getPosts);
router.get('/posts/:postId', SocialPostController.getPostById);
router.post('/posts/:postId/approve', SocialPostController.approvePost);
router.post('/posts/:postId/reject', SocialPostController.rejectPost);
router.post('/posts/check-expired', SocialPostController.checkExpiredPosts);

// Comments
router.post('/posts/:postId/comments', CommentController.addComment);
router.get('/posts/:postId/comments', CommentController.getComments);
router.put('/comments/:commentId', CommentController.updateComment);
router.delete('/comments/:commentId', CommentController.deleteComment);

export { router as socialRoutes };
