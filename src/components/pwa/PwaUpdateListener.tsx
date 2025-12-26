import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { applyPWAUpdate, checkForPWAUpdate } from "@/utils/pwaUpdate";

/**
 * Listener global de update do PWA.
 * - Registra o SW manualmente
 * - Mostra o botão "Atualizar" quando uma nova versão (deploy) estiver disponível
 * - Pensado para ser montado APÓS login (para não atrapalhar o fluxo inicial)
 */

async function fetchLatestDeployBuildId(): Promise<string | null> {
  try {
    // IMPORTANT:
    // We use a STATIC file (dist/build.json) written at BUILD TIME.
    // Netlify Functions do NOT reliably expose COMMIT_REF at runtime.
    // This was causing "update available" loops even when up-to-date.
    const res = await fetch(`/build.json?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-store, no-cache, must-revalidate" },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const id = (json as any)?.buildId;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

async function hardReload(buildId?: string | null): Promise<void> {
  // Best-effort: unregister SW + clear caches (fallback when update helper fails)
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    // ignore
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachesAny: any = (window as any).caches;
    if (cachesAny?.keys) {
      const keys = await cachesAny.keys();
      await Promise.all(keys.map((k: string) => cachesAny.delete(k)));
    }
  } catch {
    // ignore
  }
  const url = new URL(window.location.href);
  url.searchParams.set("update", String(Date.now()));
  if (buildId) url.searchParams.set("build", String(buildId));
  // Preserve hash/route; replace para não poluir histórico.
  window.location.replace(url.toString());
}

export function PwaUpdateListener() {
  const { toast } = useToast();
  const { user } = useAuth();
  const toastRef = useRef(toast);
  const userRef = useRef(user);
  const shownRef = useRef(false);
  const pendingRef = useRef(false);
  const latestBuildIdRef = useRef<string | null>(null);

  // Injetado pelo Netlify via netlify.toml: VITE_BUILD_ID=$COMMIT_REF
  const localBuildId = (import.meta as any)?.env?.VITE_BUILD_ID as string | undefined;

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const showUpdateToast = useCallback(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    toastRef.current({
      title: "🔄 Nova versão disponível!",
      description: "Toque em Atualizar para usar a versão mais recente.",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Atualiza e garante recarregar mesmo em navegadores que falham no helper.
            (async () => {
              try {
                // 1) Ask the SW to check for updates (best-effort)
                try {
                  await checkForPWAUpdate();
                } catch {
                  // ignore
                }

                // 2) Try the standard update flow (skipWaiting + reload)
                try {
                  await applyPWAUpdate();
                } catch {
                  // ignore
                }
              } catch {
                // ignore
              }

              // Fallback mais confiável: remove SW/caches e recarrega forçando a nova versão.
              const buildId = latestBuildIdRef.current ?? (await fetchLatestDeployBuildId());
              if (buildId) latestBuildIdRef.current = buildId;
              await hardReload(buildId);
            })();
          }}
          className="ml-2"
        >
          Atualizar
        </Button>
      ),
    });
  }, []);

  const checkAndPromptIfNeeded = useCallback(async () => {
    // Compare current bundle build (VITE_BUILD_ID) vs latest deploy build (build.json).
    // Show update ONLY when we can confidently detect a mismatch.
    const latest = await fetchLatestDeployBuildId();
    if (latest) latestBuildIdRef.current = latest;

    const local = localBuildId && String(localBuildId).trim() ? String(localBuildId).trim() : "";
    const hasBuildMismatch = !!(latest && local && latest !== local);

    // Se detectamos mismatch, já podemos avisar (mesmo sem waiting visível).
    if (hasBuildMismatch) {
      if (!userRef.current) {
        pendingRef.current = true;
        return;
      }
      showUpdateToast();
      return;
    }

    // If we can compare and it's equal, there is no update.
    if (latest && local && latest === local) return;

    // If we cannot compare (missing local or server id), do NOT show.
    // (Prevents false positives / loops in some browsers.)
    return;
  }, [localBuildId, showUpdateToast]);

  // Força checagem periódica (útil em PWAs que ficam abertos por muito tempo)
  useEffect(() => {
    const interval = window.setInterval(() => {
      void checkAndPromptIfNeeded();
    }, 10 * 60 * 1000); // 10 minutos

    return () => window.clearInterval(interval);
  }, [checkAndPromptIfNeeded]);

  // Se o SW detectou update ANTES do login, mostramos assim que o usuário logar.
  useEffect(() => {
    if (!user) return;

    // Após login, força checagem imediata.
    void checkAndPromptIfNeeded();

    // Se detectamos update antes do login, validamos se ainda existe waiting.
    if (!pendingRef.current) return;
    pendingRef.current = false;
    void checkAndPromptIfNeeded();
  }, [user, checkAndPromptIfNeeded]);

  return null;
}
