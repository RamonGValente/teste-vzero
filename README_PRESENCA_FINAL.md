# Presença em tempo real (final)

## O que vem neste pacote
- `src/lib/presence.ts` → `HEARTBEAT_MS=30s`, `ONLINE_TTL_MS=70s`, `isOnline()`.
- `src/hooks/usePresenceForContacts.ts` → assinatura Realtime com **filtro por IDs** + **polling 30s**.
- `src/components/contacts/ContactListItem.tsx` → calcula presença com `isOnline(status,last_seen)`.
- `src/components/social/SocialContactsList.tsx` → consome o hook e re-renderiza a lista automaticamente.
- `src/utils/logout.ts` → exemplo de logout marcando offline **antes** do `signOut()`.
- `supabase/sql/01_update_self_status.sql` → RPC para atualizar seu próprio status/last_seen.
- `supabase/sql/02_realtime_and_rls.sql` → habilita realtime + políticas RLS para leitura/atualização.

## Como aplicar
1) **Copie** estes arquivos por cima dos atuais (respeitando os caminhos).
2) No Supabase, rode **uma vez**:
   - `supabase/sql/01_update_self_status.sql`
   - `supabase/sql/02_realtime_and_rls.sql`
3) Garanta que **todo o app** usa **um único** Supabase client (o hook importa de `@/integrations/supabase/client`; ajuste se o seu for outro).
4) No fluxo de logout do app, use `logout()` do `src/utils/logout.ts` **ou**:
   ```ts
   await supabase.rpc('update_self_status', { new_status: 'offline' });
   await supabase.auth.signOut();
   ```
5) A lista lateral deve **reagir sozinha** quando alguém ficar online/offline (Realtime) e ainda faz **varredura a cada 30s** (polling).

## Teste rápido
- Abra duas contas (A e B). Em B, deixe a sidebar aberta.
- Em A, faça logout ou feche a aba → B deve ver **Offline** sem F5.
- Se não atualizar:
  - Verifique no Supabase: `profiles` está em `supabase_realtime` e com `replica identity full`.
  - Confirme que as políticas RLS foram aplicadas.
  - Verifique o **import do client** supabase no hook/componente.
