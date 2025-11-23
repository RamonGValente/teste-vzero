import { RealtimeAttentionListener } from '@/components/realtime/RealtimeAttentionListener';
import '@/styles/attention.css';
import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import AppLayout from "./components/Layout/AppLayout";
import Feed from "./pages/Feed";
import Arena from "./pages/Arena";
import Explore from "./pages/Explore";
import Messages from "./pages/Messages";
import Communities from "./pages/Communities";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { Tutorial } from "./components/Tutorial";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { useStealthMode } from "@/hooks/useStealthMode";
import { useAuth } from "@/hooks/useAuth";
import { activateUniversalStealthMode } from "@/utils/stealthDetector";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // ✅ Usuário logado: monta o listener aqui e depois renderiza o conteúdo protegido
  return (
    <>
      <RealtimeAttentionListener />
      {children}
    </>
  );
}

function StealthGuard({ children }: { children: React.ReactNode }) {
  const { config, reveal } = useStealthMode();
  const [isRevealed, setIsRevealed] = useState(!config.isHidden);

  useEffect(() => {
    setIsRevealed(!config.isHidden);
  }, [config.isHidden]);

  useEffect(() => {
    if (!config.enabled || !config.isHidden) return;

    const cleanup = activateUniversalStealthMode(config.pin, () => {
      reveal(config.pin);
      setIsRevealed(true);
    });

    return cleanup;
  }, [config.enabled, config.isHidden, config.pin, reveal]);

  if (config.enabled && config.isHidden && !isRevealed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-muted-foreground">Nova Aba</h1>
          <p className="text-sm text-muted-foreground">Página em branco</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function TutorialGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (user) {
      const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      }
    }
  }, [user]);

  const handleTutorialComplete = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setShowTutorial(false);
  };

  return (
    <>
      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}
      {children}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <StealthGuard>
        <BrowserRouter>
          <TutorialGuard>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Feed />} />
                <Route path="/arena" element={<Arena />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/communities" element={<Communities />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TutorialGuard>
        </BrowserRouter>
      </StealthGuard>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
