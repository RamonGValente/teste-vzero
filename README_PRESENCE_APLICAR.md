# Como aplicar (drop-in)

1) Copie estes arquivos por cima dos atuais:
   - src/lib/presence.ts
   - src/hooks/usePresenceForContacts.ts
   - src/components/contacts/ContactListItem.tsx
   - src/components/social/SocialContactsList.tsx

2) Garanta que seu componente lateral passe `contacts` (array de profiles) para `SocialContactsList`.
   Se seu arquivo original monta os contatos internamente, mantenha a origem, mas preserve:
   - uso de `usePresenceForContacts(contactIds)`
   - cálculo `isOnline(status, last_seen)` na hora de desenhar

3) Rode os SQLs no Supabase (uma vez):
   - supabase/sql/01_update_self_status.sql
   - supabase/sql/02_realtime_profiles.sql

4) No logout, marque offline antes do signOut:
   ```ts
   await supabase.rpc('update_self_status', { new_status: 'offline' });
   await supabase.auth.signOut();
   ```

5) Use um único Supabase client e ajuste imports se necessário (ex.: '@/integrations/supabase/client').
