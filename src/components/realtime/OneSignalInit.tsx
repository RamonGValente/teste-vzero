import { useEffect, useRef, useState } from "react";
import { withOneSignal } from "@/integrations/onesignal/oneSignal";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

let didInit = false;

async function cleanupOneSignalLocalData() {
  // Best-effort cleanup when the SDK complains: "AppID doesn't match existing apps"
  // or when a previous broken initialization left stale data.

  try {
    // Clear localStorage keys that look like OneSignal
    if (typeof localStorage !== "undefined") {
      for (const k of Object.keys(localStorage)) {
        if (k.toLowerCase().includes("onesignal")) localStorage.removeItem(k);
      }
    }
  } catch {}

  try {
    // Clear OneSignal IndexedDB (best-effort)
    const deleteDb = (name: string) =>
      new Promise<void>((resolve) => {
        try {
          const req = indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        } catch {
          resolve();
        }
      });

    const anyIDB: any = indexedDB as any;

    // 1) If the browser supports indexedDB.databases(), delete any OneSignal-like DBs.
    if (anyIDB?.databases) {
      const dbs = await anyIDB.databases();
      await Promise.all(
        (dbs || [])
          .map((d: any) => String(d?.name || ""))
          .filter((n: string) => n.toLowerCase().includes("onesignal"))
          .map((n: string) => deleteDb(n))
      );
    }

    // 2) Fallback: try common DB names used by the SDK across versions/browsers.
    const candidates = [
      "OneSignalSDK",
      "OneSignal",
      "OneSignalSDK_DB",
      "OneSignalSDK_v16",
      "onesignal",
      "onesignal-sdk",
      "onesignal-sdk-db",
      "onesignal-db",
      "ONESIGNAL_SDK",
    ];
    await Promise.all(candidates.map((n) => deleteDb(n)));
  } catch {}

  try {
    // Clear caches that may contain stale SDK assets
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.toLowerCase().includes("onesignal"))
          .map((k) => caches.delete(k))
      );
    }
  } catch {}
}

async function checkIndexedDbAvailable(): Promise<boolean> {
  // OneSignal Web SDK depends on IndexedDB.
  // If a browser/PWA has a corrupted storage or blocks persistence,
  // IndexedDB.open may throw: "Internal error opening backing store".
  try {
    if (typeof indexedDB === "undefined") return false;

    return await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (v: boolean) => {
        if (done) return;
        done = true;
        resolve(v);
      };

      const req = indexedDB.open("__udg_idb_probe__", 1);
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore("k");
        } catch {}
      };
      req.onsuccess = () => {
        try {
          req.result.close();
        } catch {}
        try {
          indexedDB.deleteDatabase("__udg_idb_probe__");
        } catch {}
        finish(true);
      };
      req.onerror = () => finish(false);
      req.onblocked = () => finish(false);

      // Safety timeout
      window.setTimeout(() => finish(false), 2500);
    });
  } catch {
    return false;
  }
}

function isBackingStoreError(err: any): boolean {
  const msg = String(err?.message || err || "");
  return msg.toLowerCase().includes("indexeddb") || msg.toLowerCase().includes("backing store");
}

/**
 * Inicializa OneSignal (Web SDK v16) e vincula o usuário logado ao External ID.
 * - Usa o mesmo Service Worker do PWA (/sw.js) no escopo raiz.
 * - Exibe um banner global após login para o usuário se inscrever no push.
 */
export function OneSignalInit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const lastLoggedId = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [optedIn, setOptedIn] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState(false);

  const [initError, setInitError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Prefer build-time Vite env, but fall back to runtime config from Netlify Functions
  const [appId, setAppId] = useState<string | undefined>(
    (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined) || undefined
  );

  useEffect(() => {
    if (appId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/.netlify/functions/app-config", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { onesignalAppId?: string };
        if (!cancelled && json?.onesignalAppId) setAppId(json.onesignalAppId);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appId]);

  // 1) Init OneSignal (once) - but allow retries when user fixes storage settings.
  useEffect(() => {
    if (!appId) {
      console.warn("[OneSignal] App ID não configurado (ONESIGNAL_APP_ID ou VITE_ONESIGNAL_APP_ID)");
      setInitError("Push indisponível: App ID do OneSignal não configurado.");
      setReady(false);
      return;
    }

    if (didInit) return;
    didInit = true;

    let cancelled = false;

    (async () => {
      setInitError(null);

      // Preflight: IndexedDB must be available
      const idbOk = await checkIndexedDbAvailable();
      if (!idbOk) {
        didInit = false;
        if (!cancelled) {
          setReady(false);
          setInitError(
            "Seu navegador/PWA bloqueou ou corrompeu o armazenamento (IndexedDB). " +
              "Para ativar push: limpe os dados do site, desinstale/reinstale o PWA e abra no Chrome/Edge/Safari normal (não no navegador do WhatsApp/Instagram)."
          );
        }
        return;
      }

      await withOneSignal(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,

            // IMPORTANT: Use the existing PWA service worker in the root scope
            // (workbox generates /sw.js and imports sw-push.js which imports the OneSignal SW).
            serviceWorkerPath: "/sw.js",
            serviceWorkerParam: { scope: "/" },

            // Keep updater path aligned (safe default)
            serviceWorkerUpdaterPath: "/sw.js",
          } as any);

          if (cancelled) return;

          setReady(true);
          try {
            setPermission(typeof window !== "undefined" ? Notification.permission : "default");
          } catch {}

          try {
            const currentOptIn = !!OneSignal?.User?.PushSubscription?.optedIn;
            setOptedIn(currentOptIn);
          } catch {}
        } catch (e: any) {
          console.error("[OneSignal] init falhou", e);

          if (cancelled) return;

          // AppID mismatch: clear local OneSignal data and retry once
          const msg = String(e?.message || e || "");
          if (msg.toLowerCase().includes("appid") && msg.toLowerCase().includes("doesn't match")) {
            console.warn("[OneSignal] AppID mismatch detectado. Limpando dados locais e tentando novamente...");
            await cleanupOneSignalLocalData();
            try {
              await OneSignal.init({
                appId,
                allowLocalhostAsSecureOrigin: true,
                serviceWorkerPath: "/sw.js",
                serviceWorkerParam: { scope: "/" },
                serviceWorkerUpdaterPath: "/sw.js",
              } as any);

              if (!cancelled) {
                setReady(true);
                setPermission(typeof window !== "undefined" ? Notification.permission : "default");
                setOptedIn(!!OneSignal?.User?.PushSubscription?.optedIn);
              }
              return;
            } catch (e2) {
              console.error("[OneSignal] re-init falhou após cleanup", e2);
            }
          }

          // Backing-store / IndexedDB errors: often caused by a corrupted OneSignal DB.
          // Try a self-heal cleanup once before asking the user to clear site data.
          if (isBackingStoreError(e)) {
            console.warn("[OneSignal] IndexedDB/backing-store error detectado. Tentando limpeza automática…");
            await cleanupOneSignalLocalData();

            try {
              await OneSignal.init({
                appId,
                allowLocalhostAsSecureOrigin: true,
                serviceWorkerPath: "/sw.js",
                serviceWorkerParam: { scope: "/" },
                serviceWorkerUpdaterPath: "/sw.js",
              } as any);

              if (!cancelled) {
                setReady(true);
                setPermission(typeof window !== "undefined" ? Notification.permission : "default");
                setOptedIn(!!OneSignal?.User?.PushSubscription?.optedIn);
                setInitError(null);
              }
              return;
            } catch (e2) {
              console.error("[OneSignal] re-init falhou após cleanup (IndexedDB)", e2);
            }

            didInit = false;
            setReady(false);
            setInitError(
              "O OneSignal não conseguiu abrir o IndexedDB (erro de armazenamento). " +
                "Tentamos reparar automaticamente, mas o navegador/PWA ainda está bloqueando ou com dados corrompidos. " +
                "Solução: limpar os dados do site, remover o PWA e instalar novamente, e testar em Chrome/Edge/Safari (não no navegador embutido do WhatsApp/Instagram)."
            );
            return;
          }

          // Generic init error
          didInit = false;
          setReady(false);
          setInitError("Falha ao inicializar o OneSignal. Recarregue a página e tente novamente.");
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [appId, retryKey]);

  // 2) Login no OneSignal com External ID (uuid do Supabase)
  useEffect(() => {
    if (!ready) return;
    if (!user?.id) return;
    if (lastLoggedId.current === user.id) return;
    lastLoggedId.current = user.id;

    withOneSignal(async (OneSignal) => {
      try {
        await OneSignal.login(user.id);
      } catch (e) {
        console.warn("[OneSignal] login falhou", e);
      }
    });
  }, [ready, user?.id]);

  // 3) Atualiza estado local de permissão/inscrição
  useEffect(() => {
    if (!ready) return;
    let mounted = true;

    const refresh = () => {
      try {
        if (!mounted) return;
        setPermission(typeof window !== "undefined" ? Notification.permission : "default");
      } catch {}

      withOneSignal((OneSignal) => {
        try {
          if (!mounted) return;
          setOptedIn(!!OneSignal?.User?.PushSubscription?.optedIn);
        } catch {}
      });
    };

    refresh();
    const id = window.setInterval(refresh, 2500);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [ready]);

  const handleSubscribe = async () => {
    if (!appId) {
      toast({
        variant: "destructive",
        title: "OneSignal não configurado",
        description: "Configure ONESIGNAL_APP_ID no Netlify (Environment variables) e faça redeploy.",
      });
      return;
    }

    if (initError) {
      toast({
        variant: "destructive",
        title: "Push indisponível neste dispositivo",
        description: "O navegador bloqueou/corrompeu o armazenamento. Veja as instruções no banner e tente novamente.",
      });
      return;
    }

    if (!ready) {
      toast({
        title: "Carregando push…",
        description: "Aguarde 1-2 segundos e tente novamente.",
      });
      return;
    }

    await withOneSignal(async (OneSignal) => {
      try {
        // Native browser prompt (recommended) + opt-in
        try {
          await OneSignal?.Notifications?.requestPermission();
        } catch {
          // ignore
        }

        await OneSignal?.User?.PushSubscription?.optIn();

        setPermission(typeof window !== "undefined" ? Notification.permission : "default");
        setOptedIn(!!OneSignal?.User?.PushSubscription?.optedIn);
        toast({ title: "Push ativado ✅", description: "Você vai receber notificações no seu dispositivo." });
      } catch (e) {
        console.warn("[OneSignal] optIn falhou", e);
        toast({
          variant: "destructive",
          title: "Não foi possível ativar o push",
          description: "Verifique as permissões do navegador e tente novamente.",
        });
      }
    });
  };

  // Banner global (somente logado)
  // Mostra banner após login.
  const shouldShowBanner = !!user?.id && !dismissed && !optedIn;
  if (!shouldShowBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Ativar notificações</div>
          <div className="text-xs text-muted-foreground">
            Receba push de <b>mensagens</b>, <b>menções</b>, <b>comentários</b>, <b>pedidos de amizade</b>, <b>chamar atenção</b> e <b>posts de amigos</b>.
          </div>

          {!appId && (
            <div className="text-xs text-destructive">
              Push indisponível: configure <b>ONESIGNAL_APP_ID</b> (Netlify) e faça redeploy.
            </div>
          )}

          {permission === "denied" && (
            <div className="text-xs text-destructive">
              Permissão bloqueada. Libere nas configurações do navegador/SO e recarregue a página.
            </div>
          )}

          {initError && (
            <div className="text-xs text-destructive">{initError}</div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
            Agora não
          </Button>

          {initError ? (
            <Button
              size="sm"
              onClick={() => {
                didInit = false;
                setRetryKey((n) => n + 1);
              }}
            >
              Tentar novamente
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubscribe} disabled={permission === "denied" || !appId}>
              Ativar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
