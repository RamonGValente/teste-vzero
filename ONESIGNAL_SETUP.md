# OneSignal Push (Web/PWA) - Setup

## 1) Criar App no OneSignal
- Crie um **Web Push App**
- Pegue o **App ID**
- Em *Keys & IDs* (ou similar), copie o **REST API Key**

## 2) Variáveis de ambiente

### Frontend (Vite / Netlify Build)
Defina:
- `VITE_ONESIGNAL_APP_ID`

### Netlify Functions (Server-side)
Defina:
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

> Em Netlify: Site settings → Build & deploy → Environment

## 3) Service Workers
Os workers do OneSignal estão em:
- `public/onesignal/OneSignalSDKWorker.js`
- `public/onesignal/OneSignalSDKUpdaterWorker.js`

E são registrados com scope `/onesignal/`.

## 4) Migração no Supabase
Execute a migração:
- `supabase/migrations/20251223000000_onesignal_notification_preferences.sql`

Isso cria a tabela:
- `public.notification_preferences`

## 5) Preferências de push
Na tela **News → Configurações**, o usuário pode:
- Habilitar/Desabilitar push
- Ligar/Desligar tipos: mensagens, menções, chamar atenção, pedidos de amizade

Essas preferências são salvas em `notification_preferences` e respeitadas pelo backend ao enviar push.

## 6) Eventos que enviam push
- Mensagens: `src/pages/Messages.tsx`
- Menções: `src/utils/mentionsHelper.ts`
- Chamar Atenção: `src/hooks/useAttentionCalls.ts` e `src/components/chat/AttentionButton.tsx`
- Pedido de amizade: `src/components/AddFriend.tsx`

## 7) Debug
- Teste push: News → botão de teste
- Checar env: `/.netlify/functions/push-env-check`
