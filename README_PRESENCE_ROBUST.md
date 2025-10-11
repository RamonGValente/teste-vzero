# Presença em tempo real – pacote robusto (sidebar sem F5)

## O que mudou
- **Assinatura Realtime com filtro no servidor** (`filter: id=in.(...)`).
- **Normalização de IDs** (tudo vira string) – evita mismatch de UUIDs/strings.
- **Polling a cada 30s** sempre ativo como autocura.
- **Logs de depuração** (PRESENCE_DEBUG=true). Desative depois.

## Como aplicar
1. Copie por cima:
   - `src/lib/presence.ts`
   - `src/lib/eventBus.ts`
   - `src/hooks/usePresenceForContacts.ts`
   - `src/components/contacts/ContactListItem.tsx`
   - `src/components/social/SocialContactsList.tsx`

2. Rode os SQLs no Supabase (uma vez):
   - `supabase/sql/01_update_self_status.sql`
   - `supabase/sql/02_realtime_profiles.sql`

3. Garanta **um único** Supabase client (ex.: `@/integrations/supabase/client`) em todo o app.

4. No logout, marque offline antes do signOut:
```ts
await supabase.rpc('update_self_status', { new_status: 'offline' });
await supabase.auth.signOut();
```

## Checklist de verificação
- Abrir duas contas (A e B). Fechar A → B deve ver **Offline** quase na hora (Realtime) ou em até 70s (TTL).
- No console da lateral, devem aparecer logs `[presence:rt]` quando o outro usuário muda.
- Em **SQL** → `profiles` possui `replica identity full` e está em `supabase_realtime`.
- IDs de contatos são **strings** compatíveis com os IDs do `profiles.id`.
- Nenhum componente usa mais `status === 'online'` sozinho; sempre `isOnline(status,last_seen)`.
