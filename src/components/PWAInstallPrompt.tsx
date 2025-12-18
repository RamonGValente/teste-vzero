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
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome\//i.test(ua) && !/EdgA\//i.test(ua) && !/OPR\//i.test(ua) && !/SamsungBrowser\//i.test(ua);
  const isXiaomi = /Xiaomi|MiuiBrowser|Mi Browser|MIUI/i.test(ua);

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
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [swControlled, setSwControlled] = useState(false);

  useEffect(() => {
    // Helps on some Android devices (including some Xiaomi):
    // PWA becomes installable only after the SW controls the page (often after 1 reload)
    setSwControlled(!!navigator?.serviceWorker?.controller);
    const onControllerChange = () => setSwControlled(!!navigator?.serviceWorker?.controller);
    navigator?.serviceWorker?.addEventListener?.('controllerchange', onControllerChange);

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
        const raw = localStorage.getItem('pwa-prompt-dismissed-at');
        const last = raw ? Number(raw) : 0;
        const day = 24 * 60 * 60 * 1000;
        if (!installed && (!last || Date.now() - last > day)) setShowPrompt(true);
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
        const raw = localStorage.getItem('pwa-prompt-dismissed-at');
        const last = raw ? Number(raw) : 0;
        const day = 24 * 60 * 60 * 1000;
        if (!last || Date.now() - last > day) setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      navigator?.serviceWorker?.removeEventListener?.('controllerchange', onControllerChange);
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
    const now = Date.now();
    setDismissedAt(now);
    localStorage.setItem('pwa-prompt-dismissed-at', String(now));
  };

  if (dismissedAt || (!showPrompt && !isInstalled)) {
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
                    <li><strong>Android (Chrome):</strong> ⋮ Menu → <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></li>
                    <li><strong>Desktop:</strong> Ícone de instalação na barra de endereços</li>
                  </ul>

                  {isAndroid && isChrome && !swControlled && (
                    <div className="mt-3 rounded-md border p-2">
                      <p className="font-medium">Dica (Android/Chrome):</p>
                      <p>
                        Em alguns aparelhos (incluindo alguns Xiaomi), a opção de instalar só aparece depois que o Service Worker
                        passa a controlar a página. Clique abaixo para recarregar e habilitar a instalação.
                      </p>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="secondary"
                        className="w-full mt-2"
                      >
                        Recarregar para habilitar instalação
                      </Button>
                    </div>
                  )}

                  {isXiaomi && isAndroid && isChrome && (
                    <div className="mt-3 rounded-md border p-2">
                      <p className="font-medium">Xiaomi/MIUI:</p>
                      <p>
                        Se você não vir “Instalar app” no menu, procure por “Adicionar à tela inicial”.
                        A instalação via banner pode não aparecer em todos os modelos.
                      </p>
                    </div>
                  )}
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
