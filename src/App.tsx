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
import { CallProvider } from "@/providers/CallProvider";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to initialize user activity tracking and idle logout
const UserActivityTracker = () => {
  useUserActivity();
  useIdleLogout();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            {/* CallProvider deve envolver componentes que usam chamadas */}
            <CallProvider>
              <UserActivityTracker />
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {/* Listener GLOBAL que mostra a notificação em qualquer rota */}
                <RealtimeAttentionListener />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </CallProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;