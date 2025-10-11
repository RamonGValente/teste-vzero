# Patch de Presença aplicado (2025-10-11T23:04:32)

- Reescrito `src/lib/presence.ts` com TTL consistente e helper `isOnline`.
- Refeito `src/hooks/useOnlineStatus.ts` com heartbeat a cada 20s, visibilidade e unload.
- Refeito `src/hooks/usePresenceForContacts.ts` para assinar mudanças no Postgres (Supabase Realtime) filtrando pelos IDs e com polling de autocura.
- Normalizado `src/components/contacts/ContactListItem.tsx` para exibir "Online/Offline" e ponto verde/cinza com base em `isOnline`.
- Injetado `useOnlineStatus()` no `src/App.tsx`/`src/App.js` para ativar presença globalmente.
- Este patch atualiza a lista lateral de contatos automaticamente quando o status muda.
