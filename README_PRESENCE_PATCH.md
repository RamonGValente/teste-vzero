# UDG Presence Patch (Online/Offline em Tempo Real)

Este pacote implementa presença **ONLINE** enquanto o PWA estiver aberto (mesmo em segundo plano/ocioso) e **OFFLINE** ao fechar, com atualizações **em tempo real** via Supabase Realtime e heartbeat de **30s**.

## Conteúdo
- `src/lib/presence.ts`: utilitários (`HEARTBEAT_MS`, `ONLINE_TTL_MS`, `isOnline`).
- `src/lib/database.ts`: helper `updateSelfStatus` (RPC).
- `src/services/onlineStatusService.ts`: serviço de presença (heartbeat + unload offline + assinatura realtime).
- `src/hooks/useOnlinePresence.ts`: hook para inicializar o serviço no app.
- `src/realtime/subscribeProfilesRealtime.ts`: helper para assinar mudanças em `profiles`.
- `supabase/sql/01_update_self_status.sql`: função RPC para atualizar status/last_seen do usuário autenticado.
- `supabase/sql/02_sweep_offline.sql`: varredura de expiração (TTL=75s).
- `supabase/sql/03_pg_cron_optional.sql`: agendamento opcional com pg_cron (1/min).

## Passo a passo

1) **Executar SQL no Supabase**
   - Abra o **SQL Editor** e rode os arquivos em `supabase/sql` (na ordem 01, 02 e 03 - o 03 é opcional).
   - Garanta RLS para `profiles` (se necessário):
     ```sql
     alter table public.profiles enable row level security;
     drop policy if exists "update_own_profile" on public.profiles;
     create policy "update_own_profile"
     on public.profiles
     as permissive
     for update
     to authenticated
     using (id = auth.uid())
     with check (id = auth.uid());
     ```

2) **Copiar arquivos para o seu projeto**
   - Mescle as pastas `src/` e `supabase/` com as do seu repositório.
   - Ajuste imports `@/lib/supabase` conforme seu caminho real.

3) **Iniciar o serviço globalmente**
   - No componente raiz (ex. `App.tsx`):
     ```tsx
     import { useOnlinePresence } from '@/hooks/useOnlinePresence';

     export default function App() {
       useOnlinePresence();
       return (/* ... */);
     }
     ```

   - No fluxo de **logout**:
     ```ts
     import { onlineStatusService } from '@/services/onlineStatusService';
     import { supabase } from '@/lib/supabase';

     await onlineStatusService.forceOffline();
     await supabase.auth.signOut();
     await onlineStatusService.stop();
     ```

4) **UI em tempo real (sem refresh)**
   - Em qualquer componente/store que liste usuários/contatos, assine `profiles`:
     ```ts
     import { subscribeProfilesRealtime } from '@/realtime/subscribeProfilesRealtime';

     useEffect(() => {
       const unsub = subscribeProfilesRealtime((row) => {
         // atualize seu store: row.id, row.status, row.last_seen
       });
       return () => unsub();
     }, []);
     ```

   - Renderize presença com:
     ```ts
     import { isOnline } from '@/lib/presence';
     const online = isOnline(user.status, user.last_seen);
     ```

5) **Observações importantes**
   - O navegador pode "desacelerar" timers em segundo plano, mas o WebSocket do Supabase e nosso heartbeat de 30s mantêm tudo sincronizado em PWAs instaladas. O RPC no `pagehide/beforeunload` marca *offline* ao fechar.
   - O `sweep_offline` no banco serve como autocura se um heartbeat falhar (por oscilação de rede, suspensão do SO, etc.).

## Testes
- Com usuário logado e app aberto: deve exibir **Online** e manter assim sem interação.
- Minimize/oculte por >30–60s: continua **Online**.
- Feche a aba ou PWA: fica **Offline** quase imediatamente (ou em até 75s via sweep).
- Reconecte com rede instável: status converge automaticamente via realtime/sweep.
