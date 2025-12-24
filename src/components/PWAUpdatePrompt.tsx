import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type BuildInfo = {
  buildId?: string | null;
  builtAt?: string | null;
  timestamp?: string | null;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchBuildInfo(): Promise<BuildInfo | null> {
  // 1) Prefer a Netlify Function (network fetch, not precached)
  try {
    const r = await fetch(`/.netlify/functions/build-info?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-store" },
    });
    if (r.ok) {
      const j = await safeJson(r);
      if (j && typeof j === "object") return j as BuildInfo;
    }
  } catch {
    // ignore
  }

  // 2) Fallback: static build.json (written in postbuild)
  try {
    const r = await fetch(`/build.json?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-store" },
    });
    if (r.ok) {
      const j = await safeJson(r);
      if (j && typeof j === "object") return j as BuildInfo;
    }
  } catch {
    // ignore
  }

  return null;
}

async function hardReload(): Promise<void> {
  // Best-effort: unregister SW + clear caches
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

  const base = window.location.href.split("?")[0];
  window.location.replace(`${base}?update=${Date.now()}`);
}

export function PWAUpdatePrompt() {
  const localBuild = useMemo(() => {
    const v = (import.meta as any).env?.VITE_BUILD_ID as string | undefined;
    return v && String(v).trim() ? String(v).trim() : "";
  }, []);

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverBuild, setServerBuild] = useState<string>("");
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const info = await fetchBuildInfo();
      const serverId = (info?.buildId ?? "") ? String(info?.buildId) : "";

      if (serverId) {
        setServerBuild(serverId);
      }

      // Comparison strategy:
      // - If we have localBuild, compare directly
      // - Else compare server build to the last server build we stored (still useful)
      const lastServerSeen = localStorage.getItem("udg:lastServerBuild") || "";
      if (serverId) localStorage.setItem("udg:lastServerBuild", serverId);

      const shouldShow =
        (localBuild && serverId && serverId !== localBuild) ||
        (!localBuild && serverId && lastServerSeen && serverId !== lastServerSeen);

      if (shouldShow) {
        // Ask SW to check for an update too (helps create a waiting SW).
        try {
          const reg = (window as any).__swRegistration as ServiceWorkerRegistration | undefined;
          await reg?.update();
        } catch {
          // ignore
        }
        setUpdateAvailable(true);
      }
    } finally {
      setChecking(false);
    }
  }, [localBuild]);

  useEffect(() => {
    // Check immediately on mount (ProtectedRoute => user is logged in)
    void check();

    const onNeedRefresh = () => setUpdateAvailable(true);
    window.addEventListener("pwa:need-refresh", onNeedRefresh);
    return () => window.removeEventListener("pwa:need-refresh", onNeedRefresh);
  }, [check]);

  const doUpdate = useCallback(async () => {
    try {
      const updateSW = (window as any).__updateSW as undefined | ((reload?: boolean) => Promise<void> | void);
      const reg = (window as any).__swRegistration as ServiceWorkerRegistration | undefined;

      // If there's a waiting SW, activate it now.
      if (reg?.waiting) {
        try {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        } catch {
          // ignore
        }
      }

      // vite-plugin-pwa helper
      if (updateSW) {
        await updateSW(true);
        return;
      }
    } catch {
      // ignore
    }

    // Hard fallback
    await hardReload();
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div className="mx-auto max-w-3xl m-3 rounded-xl border bg-background/95 backdrop-blur shadow-lg p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">Nova versão disponível</div>
          <div className="text-sm text-muted-foreground break-words">
            Atualize para pegar as últimas correções.
            {serverBuild ? ` (Servidor: ${serverBuild}${localBuild ? ` · Atual: ${localBuild}` : ""})` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={check} disabled={checking}>
            {checking ? "Verificando..." : "Verificar"}
          </Button>
          <Button onClick={doUpdate}>Atualizar</Button>
        </div>
      </div>
    </div>
  );
}
