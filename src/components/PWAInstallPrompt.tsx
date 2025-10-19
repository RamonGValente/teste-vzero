import { useEffect, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandalone } from "@/utils/pwa";
import { Card } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  useEffect(() => {
    try {
      if (isStandalone()) {
        setIsInstalled(true);
        setShowPrompt(false);
      }
    } catch {}
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      // Check if running as standalone (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      // Check if running on mobile Safari home screen
      if ((navigator as any).standalone) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    const installed = checkInstalled();

    // Listen for beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3 seconds if not dismissed before
      setTimeout(() => {
        const wasDismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (!wasDismissed && !installed) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For Safari and other browsers, show manual install prompt
    if (!installed && !deferredPrompt) {
      setTimeout(() => {
        const wasDismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (!wasDismissed) {
          setShowPrompt(true);
        }
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Edge install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
      // Manual install instructions remain visible
      // User needs to use browser menu
    }
  };

  const handleOpenPWA = () => {
    // Try to open the installed PWA
    const appUrl = window.location.origin;
    window.open(appUrl, '_blank');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (dismissed || (!showPrompt && !isInstalled)) {
    return null;
  }

  // If installed, show "Open App" prompt
  if (isInstalled && !window.matchMedia('(display-mode: standalone)').matches) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom-5">
        <Card className="p-4 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-card to-card/95 backdrop-blur">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-primary to-secondary p-3 rounded-xl">
              <ExternalLink className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">App Instalado!</h3>
              <p className="text-sm text-muted-foreground mb-3">
                O app já está instalado. Abra para uma melhor experiência.
              </p>
              
              <Button 
                onClick={handleOpenPWA}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir App
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If not installed, show install prompt
  if (showPrompt && !isInstalled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom-5">
        <Card className="p-4 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-card to-card/95 backdrop-blur">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-primary to-secondary p-3 rounded-xl">
              <Download className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Instalar App</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {deferredPrompt 
                  ? "Instale o app para acesso rápido e use offline."
                  : "Adicione à tela inicial para acesso rápido e melhor experiência."}
              </p>
              
              {deferredPrompt ? (
                <Button 
                  onClick={handleInstallClick}
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Instalar Agora
                </Button>
              ) : (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium">Como instalar:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>iPhone/iPad:</strong> Toque em Compartilhar → Adicionar à Tela Inicial</li>
                    <li><strong>Android:</strong> Menu do navegador → Adicionar à tela inicial</li>
                    <li><strong>Desktop:</strong> Ícone de instalação na barra de endereços</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
