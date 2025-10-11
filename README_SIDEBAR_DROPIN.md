# Sidebar de contatos com presença *sem F5* (drop-in)

## O que este pacote faz
- Descobre os **contatos do usuário logado** via `public.contacts`.
- Assina **Realtime** de `public.profiles` apenas para esses IDs (filtro server-side).
- Faz **polling a cada 30s** como rede de segurança.
- Renderiza a lista diretamente com `<SidebarContacts/>`, sem depender de props externas.

## Como integrar
1) Copie os arquivos para o seu projeto nos mesmos caminhos.
2) No Supabase, rode **uma vez** os SQLs em `supabase/sql/`:
   - `01_update_self_status.sql`
   - `02_realtime_and_rls.sql`
3) No lugar onde você renderiza a lista lateral, importe e use:
```tsx
import SidebarContacts from '@/components/social/SidebarContacts';

// ...
<SidebarContacts />
```
4) Certifique-se de que **todo o app** usa um **único** client Supabase (o import dos arquivos aponta para `@/integrations/supabase/client`). Ajuste se o seu client estiver em outro caminho.
5) No logout, marque offline **antes** do `signOut()`:
```ts
await supabase.rpc('update_self_status', { new_status: 'offline' });
await supabase.auth.signOut();
```

## Dicas de debug
- Deixe `PRESENCE_DEBUG = true` em `src/lib/presence.ts` para ver logs no console.
- Você deve ver logs `[presenceStore]` e `[presenceStore:rt]` ao logar/deslogar contatos.
- Se não aparecer nada, verifique no Supabase:
  - `profiles` está em `supabase_realtime`
  - RLS policies deste pacote foram aplicadas
