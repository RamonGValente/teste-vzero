# Notificação de "Chamar Atenção" no estilo original

Este patch volta a emitir o alerta **como no seu sistema original**, usando prioridade:
1) `window.__appNotify('attention', payload)` — se seu `NotificationProvider` antigo expunha essa função.
2) `dispatchEvent(new CustomEvent('attention:notify', { detail }))` — para listeners legados.
3) *Fallback* para `sonner` apenas se os dois anteriores não existirem (não afeta seu layout antigo).

## O que substituir
- `src/components/realtime/RealtimeAttentionListener.tsx` — agora usa `notifyAttention()`
- `src/lib/notifications/attentionNotify.ts` — helper de compatibilidade
- `src/types/global.d.ts` — tipagem da função global

## Como garantir que fica **exatamente** como antes
No seu `NotificationProvider` (ou onde a UI antiga era renderizada), exponha a função:
```ts
// Exemplo
useEffect(() => {
  window.__appNotify = (type, payload) => {
    if (type === 'attention') {
      // chamar o notificador antigo aqui (sua UI custom)
      // ex.: openNotificationCard(payload)
    }
  };
  return () => { delete window.__appNotify; };
}, []);
```

Pronto: o alert volta a sair pelo **mesmo notificador antigo**. Se não houver essa função, um `CustomEvent('attention:notify')` será disparado
(útil se você já tinha um listener `window.addEventListener('attention:notify', ...)`).
