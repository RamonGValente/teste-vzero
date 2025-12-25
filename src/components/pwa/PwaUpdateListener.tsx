import { useCallback, useEffect, useRef } from "react";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Listener global de update do PWA.
 * - Registra o SW manualmente
 * - Mostra o botão "Atualizar" quando uma nova versão (deploy) estiver disponível
 * - Pensado para ser montado APÓS login (para não atrapalhar o fluxo inicial)
 */

// Mantém registro único, mesmo se o componente for montado mais de uma vez.
let _registered = false;
let _updateSW: ((reloadPage?: boolean) => Promise<void> | void) | null = null;
let _swRegistration: ServiceWorkerRegistration | null = null;

async function fetchLatestDeployBuildId(): Promise<string | null> {
  try {
    // Cache-bust: alguns PWAs/navegadores podem insistir em cachear respostas.
    const res = await fetch(`/.netlify/functions/build-info?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-store, no-cache, must-revalidate" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.buildId || null;
  } catch {
    return null;
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (_swRegistration) return _swRegistration;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    _swRegistration = reg ?? null;
    return _swRegistration;
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
                const reg = await getRegistration();
                // Se existe um SW aguardando (waiting), ativamos ele.
                if (reg?.waiting) {
                  try {
                    reg.waiting.postMessage({ type: "SKIP_WAITING" });
                  } catch {
                    // ignore
                  }
                }

                // Sempre tentamos atualizar o registro antes do hard reload.
                try {
                  await reg?.update();
                } catch {
                  // ignore
                }

                // Helper do vite-plugin-pwa (se disponível). Em alguns PWAs ele pode falhar,
                // então mesmo assim fazemos um hard reload como fallback.
                if (_updateSW) {
                  try {
                    await _updateSW(true);
                  } catch {
                    // ignore
                  }
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
    // Primeiro: compara o commit do bundle atual (VITE_BUILD_ID) com o último deploy (Netlify).
    // Isso evita o bug de "botão aparece mesmo atualizado".
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

    // Se temos buildId e ele bate, não mostramos update (mesmo que waiting apareça por bug).
    // Se conseguimos comparar e está igual, não há update.
    if (latest && local && latest === local) return;

    // Se NÃO temos VITE_BUILD_ID (caso raro), evitamos falsos positivos do "waiting".
    // Nesse caso, só avisamos se o build do servidor mudou vs o último visto.
    if (latest && !local) {
      const lastSeen = localStorage.getItem("udg:lastServerBuild") || "";
      if (lastSeen && latest !== lastSeen) {
        localStorage.setItem("udg:lastServerBuild", latest);
        if (!userRef.current) {
          pendingRef.current = true;
          return;
        }
        showUpdateToast();
      } else {
        localStorage.setItem("udg:lastServerBuild", latest);
      }
      return;
    }

    // Fallback: lógica clássica do SW waiting.
    if (!navigator.serviceWorker.controller) return;

    const reg = await getRegistration();
    if (!reg) return;

    try {
      await reg.update();
    } catch {
      // ignore
    }

    if (!reg.waiting) return;

    if (!userRef.current) {
      pendingRef.current = true;
      return;
    }

    showUpdateToast();
  }, [localBuildId, showUpdateToast]);

  useEffect(() => {
    if (_registered) return;
    _registered = true;

    // Registra SW e recebe callbacks de atualização
    _updateSW = registerSW({
      immediate: true,
      onRegistered(r) {
        _swRegistration = r ?? null;
        // expõe para debug
        (window as any).__swRegistration = r;
      },
      onNeedRefresh() {
        // Em alguns navegadores, o onNeedRefresh pode disparar no primeiro install.
        // Só exibimos se o app já tem um controller (ou seja, não é first install).
        void checkAndPromptIfNeeded();
      },
    });

    // Força checagem periódica (útil em PWAs que ficam abertos por muito tempo)
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
