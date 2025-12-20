import { RealtimeAttentionListener } from "@/components/realtime/RealtimeAttentionListener";
import { RealtimeMessageListener } from "@/components/realtime/RealtimeMessageListener";
import { PushNotificationsBootstrap } from "@/components/realtime/PushNotificationsBootstrap";
import "@/styles/attention.css";
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
import News from "./pages/News";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { Tutorial } from "./components/Tutorial";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { useAuth } from "@/hooks/useAuth";
import Rankings from "@/pages/Rankings";
import { MovementStatusProvider } from "@/contexts/MovementStatusContext";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MovementStatusProvider>
      <RealtimeAttentionListener />
      <RealtimeMessageListener />
      <PushNotificationsBootstrap />
      {children}
    </MovementStatusProvider>
  );
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
      <BrowserRouter>
        <TutorialGuard>
          <Routes>
            {/* Auth + recuperação */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />

            {/* Rotas protegidas */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Feed />} />
              <Route path="/arena" element={<Arena />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/news" element={<News />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TutorialGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;