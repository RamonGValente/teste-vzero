import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyPWAUpdate, checkForPWAUpdate, getPWAUpdateState, subscribeToPWAUpdate } from "@/utils/pwaUpdate";
import { useAuth } from "@/hooks/useAuth";

/**
 * Shows a small banner when a new deploy (service worker) is available.
 *
 * Requirement from user:
 * "logo assim que usuario logar... verifique se está na versão atual do deploy
 * e se não, mostrar botão para atualizar".
 */
export function PWAUpdatePrompt() {
  const { user } = useAuth();
  const [needRefresh, setNeedRefresh] = useState(getPWAUpdateState().needRefresh);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPWAUpdate(() => {
      setNeedRefresh(getPWAUpdateState().needRefresh);
    });
    return () => unsub();
  }, []);

  // When the user logs in, proactively check for a new SW.
  useEffect(() => {
    if (!user) return;
    // check right away and then once more after a short delay (helps on some Android)
    checkForPWAUpdate();
    const t = window.setTimeout(() => {
      checkForPWAUpdate();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [user]);

  if (!user) return null;
  if (!needRefresh) return null;

  return (
    <div className="fixed top-3 left-1/2 z-[60] -translate-x-1/2 w-[min(92vw,520px)]">
      <Card className="p-3 shadow-lg border bg-background">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-semibold">Atualização disponível</div>
            <div className="text-muted-foreground">
              Uma nova versão foi publicada. Clique para atualizar.
            </div>
          </div>
          <Button
            onClick={async () => {
              try {
                setUpdating(true);
                await applyPWAUpdate();
              } finally {
                setUpdating(false);
              }
            }}
            disabled={updating}
          >
            {updating ? "Atualizando…" : "Atualizar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
