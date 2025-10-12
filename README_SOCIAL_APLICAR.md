# Como aplicar as mudanças da rede social
1) Rode as migrações em `db/migrations` (01→07) se ainda não estiverem no seu banco.
2) Rode o patch incremental: `db/patches/patch_2025-10-11_social.sql`.
3) Garanta no servidor:
   ```ts
   import { socialRoutes } from './social/routes/socialRoutes';
   app.use('/api/social', socialRoutes);

   import { ExpiredPostsJob } from './jobs/expiredPostsJob';
   ExpiredPostsJob.start();
   ```
4) Instale `node-cron` no package.json (se faltar).
