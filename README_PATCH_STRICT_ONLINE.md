# Patch: Presença STRICT (sem falso-positivo)

## O que muda
- **Online** só quando `status === 'online'` **E** `last_seen` está dentro do TTL (70s).
- Lista lateral atualiza **sem F5** (Realtime + polling 30s).
- Componente drop‑in `SidebarContacts` (se quiser usar sem props).

## Como aplicar
1) Extraia o zip por cima do projeto (mesmos caminhos).
2) Nos seus componentes da lista, garanta que usa:
   ```ts
   const online = isOnline(status, last_seen);
   ```
   **Nunca** `status === 'online'` direto.
3) Se for usar o drop‑in:
   ```tsx
   import SidebarContacts from '@/components/social/SidebarContacts';
   <SidebarContacts />
   ```
4) No Supabase, rode os SQLs (se ainda não rodou). Se aparecer erro 42710 na publicação, **ignore** — significa que já estava habilitado.
5) No logout:
   ```ts
   await supabase.rpc('update_self_status', { new_status: 'offline' });
   await supabase.auth.signOut();
   ```

## Dica
Se um usuário ficar “preso” online, mas o `last_seen` parou, com este patch ele aparecerá **Offline** após 70s (TTL).
