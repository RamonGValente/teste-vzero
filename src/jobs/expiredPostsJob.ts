import cron from 'node-cron';
import { SocialPostService } from '../social/services/SocialPostService';

export class ExpiredPostsJob {
  static start() {
    // Executa a cada minuto
    cron.schedule('* * * * *', async () => {
      try {
        await SocialPostService.checkExpiredPosts();
      } catch (error) {
        console.error('Error in expired posts job:', error);
      }
    });
  }
}
