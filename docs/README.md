# Patch: Presença Online/Offline + Notificação Global de "Chamar Atenção" (topo, som + shake)

## O que este pacote entrega
- **Presença CONFIÁVEL** (online/offline) com base em `status` **e** `last_seen`:
  - Hook robusto `useOnlineStatus` que mantém seu usuário online (heartbeat) e marca offline ao sair.
  - Hook `useContactPresence` (p/ header do chat) usando util `isOnline(status,last_seen)`.
  - Hook `usePresenceForContacts` (p/ menu lateral) com realtime de toda a lista.
  - Util `isOnline` com TTL de 70s.
- **UI**: anel **verde** (online) / **vermelho** (offline) no avatar **no menu** e **no header do chat**.
- **Atenção**: listener global `RealtimeAttentionListener` com toast **no topo**, **shake** e **som**.
- **CSS**: `attention.css` inclui animação de shake no `<body>` e estilos do toast.
- **SQL**: `presence_server.sql` adiciona a **RPC** `set_presence(boolean)` + RLS + realtime para `profiles`.

## Como integrar no seu projeto (2 passos obrigatórios + 2 opcionais)
1. **Copie** estes arquivos para os **mesmos caminhos** do seu projeto:
   - `src/lib/presence.ts`
   - `src/hooks/useOnlineStatus.ts`
   - `src/hooks/useContactPresence.ts`
   - `src/hooks/usePresenceForContacts.ts`
   - `src/components/realtime/RealtimeAttentionListener.tsx`
   - `src/styles/attention.css`
   - (Opcional, se quiser reaproveitar anel e texto) ajuste seus componentes `ContactList.tsx` e `ChatWindow.tsx` conforme os exemplos abaixo.

2. **No Supabase**, execute o conteúdo de `supabase/sql/presence_server.sql`.
   - Cria/atualiza a função `public.set_presence(p_online boolean)` (SECURITY DEFINER)
   - Garante a política de update do próprio perfil
   - Garante `public.profiles` na publicação `supabase_realtime`

3. **No componente raiz da aplicação** (ex.: `src/App.tsx` ou `src/main.tsx` / `AppLayout.tsx`):
   - Garanta o Toaster do Sonner **no topo**:
   ```tsx
   import { Toaster } from 'sonner';
   import { RealtimeAttentionListener } from '@/components/realtime/RealtimeAttentionListener';
   import '@/styles/attention.css';

   export default function App() {
     useOnlineStatus(); // <<< import { useOnlineStatus } from '@/hooks/useOnlineStatus';

     return (
       <>
         <Toaster position="top-center" richColors />
         <RealtimeAttentionListener />
         {/* ...restante do app... */}
       </>
     );
   }
   ```

4. **Som** (opcional): coloque um arquivo em `public/sounds/attention.mp3` ou grave uma URL em
   `user_notification_settings.attention_sound_url`. O listener cai num beep via WebAudio se o autoplay for bloqueado.

## Exemplos de uso nos seus componentes

### a) Header do Chat (ring + botão do sino desabilitado quando offline)
```tsx
import { useContactPresence } from '@/hooks/useContactPresence';
import { isOnline } from '@/lib/presence';

const { contactOnline, status, lastSeen } = useContactPresence(contact?.id);
const headerOnline = isOnline(status, lastSeen || null);

// Avatar com anel
<div className={\`relative inline-flex rounded-full p-[2px] \${headerOnline ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'}\`}>
  <div className="rounded-full overflow-hidden">
    <Avatar className="h-10 w-10"> ... </Avatar>
  </div>
</div>

// Sino
<AttentionCallButton contactId={contact.id} contactName={contact.full_name || 'Usuário'} contactOnline={headerOnline} />
```

### b) Menu Lateral (ring + texto “Online”/“Visto há …”)
```tsx
import { usePresenceForContacts } from '@/hooks/usePresenceForContacts';
import { isOnline } from '@/lib/presence';

const presenceMap = usePresenceForContacts(contacts.map(c => c.profiles?.id || c.contact_id || c.id));

{contacts.map(contact => {
  const id = contact.profiles?.id || contact.contact_id || contact.id;
  const p = presenceMap[id];
  const online = isOnline(p?.status ?? contact.profiles?.status, p?.last_seen ?? contact.profiles?.last_seen);
  return (
    <div key={id} className="...">
      <div className={\`relative inline-flex rounded-full p-[2px] \${online ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'}\`}>
        <div className="rounded-full overflow-hidden">
          <Avatar className="h-10 w-10"> ... </Avatar>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {online ? 'Online' : (p?.last_seen ? ('Visto há ' + formatDistanceToNow(new Date(p.last_seen), { addSuffix: false, locale: ptBR })) : 'Offline')}
      </div>
    </div>
  );
})}
```

> Dica: se quiser que eu aplique isso nos seus arquivos exatos (`ContactList.tsx`, `ChatWindow.tsx`), me envie esses dois originais e eu devolvo já colado na sua base.
