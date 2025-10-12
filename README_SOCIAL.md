# Integração — Social (Menções, Aprovação e Comentários)

- Rotas montadas em `/api/social` (inseridas no seu app quando possível).
- Cron `ExpiredPostsJob` iniciado no entrypoint do servidor (quando encontrado).
- SQLs em `db/migrations` — rode na ordem 01 → 07.
- Exemplos de componentes React em `frontend/components`.

Caso seu entrypoint/estrutura difira, monte manualmente:
```ts
import { socialRoutes } from './social/routes/socialRoutes';
app.use('/api/social', socialRoutes);

import { ExpiredPostsJob } from './jobs/expiredPostsJob';
ExpiredPostsJob.start();
```
