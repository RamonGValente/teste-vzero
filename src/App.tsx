import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import "@/styles/attention.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { RealtimeAttentionListener } from "@/components/realtime/RealtimeAttentionListener";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// Opcional: se existir esse hook no seu projeto, manter a importação
import { useOnlinePresence } from "@/hooks/useOnlinePresence";

// SocialNetwork: ajuste o caminho conforme sua estrutura.
// Aqui uso o padrão: pasta 'components/social' (minúscula).
import SocialNetwork from "@/components/social/SocialNetwork";

const queryClient = new QueryClient();

// Componente para iniciar rastreio de atividade e logout por ociosidade
const UserActivityTracker = () => {
  useUserActivity();
  useIdleLogout();
  return null;
};

function App() {
  // Inicializa presença do usuário (heartbeat/visibilidade/unload)
  useOnlineStatus();
  // Se o projeto tiver um hook adicional de presença, mantenha a chamada.
  try {
    // @ts-ignore - pode não existir em todos os projetos
    useOnlinePresence?.();
  } catch {}

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <UserActivityTracker />
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {/* Listener GLOBAL que mostra a notificação em qualquer rota */}
                <RealtimeAttentionListener />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/social" element={<SocialNetwork />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
