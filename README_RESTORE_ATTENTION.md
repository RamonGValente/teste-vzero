# Patch: Restaurar notificação de "Chamar Atenção" (estilo do pacote original)

Arquivos:
- src/components/realtime/RealtimeAttentionListener.tsx (porta 1:1 da versão legada; usa CSS e som)
- src/hooks/useAttentionCalls.ts (grava no banco **e** faz broadcast instantâneo)
- src/components/notifications/NotificationProvider.tsx (para reproduzir som e web notification)
- src/components/notifications/AttentionCallNotification.tsx (toaster com shake)
- src/styles/attention.css (efeito de shake e layout do toast)
- public/sounds/attention.wav (som padrão)

Importante: este patch usa `@/integrations/supabase/client`. Ajuste se seu client estiver em outro caminho.
