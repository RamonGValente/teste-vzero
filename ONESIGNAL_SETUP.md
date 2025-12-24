# OneSignal Push (Web/PWA) - Setup

## 1) Criar App no OneSignal
- Crie um **Web Push App**
- Pegue o **App ID**
- Em *Keys & IDs* (ou similar), copie o **REST API Key**

## 2) Variáveis de ambiente

### Runtime (recomendado - não depende de rebuild)
O frontend busca o App ID via `/.netlify/functions/app-config`.
Defina:
- `ONESIGNAL_APP_ID`

### Frontend (Vite / Netlify Build) (opcional)
Se você preferir embutir no bundle no build, também pode definir:
- `VITE_ONESIGNAL_APP_ID`

### Netlify Functions (Server-side)
Defina:
- `ONESIGNAL_REST_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

> Em Netlify: Site settings → Build & deploy → Environment

## 3) Service Workers
Os workers do OneSignal estão em:
- `public/onesignal/OneSignalSDKWorker.js`
- `public/onesignal/OneSignalSDKUpdaterWorker.js`

E são registrados no **escopo /onesignal/** para **não conflitar** com o Service Worker do PWA (`/sw.js`).

## 4) Migração no Supabase
Execute as migrações:
- `supabase/migrations/20251223000000_onesignal_notification_preferences.sql`
- `supabase/migrations/20251223010000_add_posts_comments_to_notification_preferences.sql`

Isso cria a tabela:
- `public.notification_preferences`

## 5) Preferências de push
Na tela **News → Configurações**, o usuário pode:
- Habilitar/Desabilitar push
 - Ligar/Desligar tipos: mensagens, menções, chamar atenção, pedidos de amizade, comentários e posts de amigos

Essas preferências são salvas em `notification_preferences` e respeitadas pelo backend ao enviar push.

## 6) Eventos que enviam push
- Mensagens: `src/pages/Messages.tsx`
- Menções: `src/utils/mentionsHelper.ts`
- Chamar Atenção: `src/hooks/useAttentionCalls.ts` e `src/components/chat/AttentionButton.tsx`
- Pedido de amizade: `src/components/AddFriend.tsx`
 - Comentários: `src/pages/Feed.tsx` (quando comenta em um post)
 - Posts de amigos (Arena): `src/pages/Feed.tsx` (quando publica um post)

## 7) Debug
- Teste push: News → botão de teste
- Checar env: `/.netlify/functions/push-env-check`
