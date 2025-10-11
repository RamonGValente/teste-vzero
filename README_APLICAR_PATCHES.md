# Como aplicar as mudanças de presença (online/offline) – UDG

Este pacote contém **arquivos prontos** e **patches** para seu projeto, usando os caminhos exatos que você tem.

## 1) Copie estes arquivos (sobrescrevem os atuais se existirem)
- `src/lib/presence.ts`  → adiciona `HEARTBEAT_MS=30_000` e mantém `ONLINE_TTL_MS=70_000` + `isOnline()`
- `src/hooks/usePresenceForContacts.ts` → agora faz **polling a cada 30s** e **assina Realtime**

## 2) Aplique os patches (ou edite manualmente)

### 2.1. ContactListItem → usar `isOnline(status,last_seen)`
Arquivo do patch:
```
patches/01-contactlistitem-isOnline.diff
```
Se preferir editar manualmente, no `src/components/contacts/ContactListItem.tsx`:
- Adicione: `import { isOnline } from '@/lib/presence';`
- Substitua:
  ```ts
  const status = (presence?.status ?? contact.status ?? 'offline') as string;
  const online = status === 'online';
  const lastSeen = presence?.last_seen ?? contact.last_seen ?? null;
  ```
  por
  ```ts
  const status = (presence?.status ?? contact.status ?? 'offline') as string;
  const lastSeen = presence?.last_seen ?? contact.last_seen ?? null;
  const online = isOnline(status, lastSeen);
  ```

### 2.2. SocialContactsList → ligar o polling + realtime
Arquivo do patch:
```
patches/02-socialcontactslist-use-presence.diff
```
Ou edite manualmente o `src/components/social/SocialContactsList.tsx`:
- Adicione imports:
  ```ts
  import { usePresenceForContacts } from '@/hooks/usePresenceForContacts';
  import { isOnline } from '@/lib/presence';
  ```
- Depois de calcular `contacts`, crie:
  ```ts
  const contactIds = useMemo(() => contacts.map((c: any) => c.id), [contacts]);
  const presenceMap = usePresenceForContacts(contactIds);
  ```
- Ao renderizar cada item, troque:
  ```ts
  const status = c.status ?? 'offline';
  const lastSeen = c.last_seen ?? null;
  const online = status === 'online';
  ```
  por
  ```ts
  const p = presenceMap[c.id];
  const status = (p?.status ?? c.status ?? 'offline') as string;
  const lastSeen = p?.last_seen ?? c.last_seen ?? null;
  const online = isOnline(status, lastSeen);
  ```

## 3) Garantias
- A lista muda **sem recarregar a página** (Realtime).
- E faz **varredura a cada 30s** para corrigir qualquer perda de evento.
- A regra de presença usa `status + last_seen + TTL` (sem falsos positivos).

## 4) Observações
- Use **um único** Supabase client. O hook está importando de `@/integrations/supabase/client` — ajuste se o seu client for outro.
- No logout, marque `offline` **antes** do `signOut()`:
  ```ts
  await supabase.rpc('update_self_status', { new_status: 'offline' });
  await supabase.auth.signOut();
  ```
