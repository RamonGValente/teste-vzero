import { useEffect, useRef, useState } from "react";
import { withOneSignal } from "@/integrations/onesignal/oneSignal";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

let didInit = false;

async function cleanupOneSignalAppIdMismatch() {
  // Best-effort cleanup when the SDK complains: "AppID doesn't match existing apps"
  try {
    // 1) unregister OneSignal service workers
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => {
            const url = String(r?.active?.scriptURL || r?.installing?.scriptURL || r?.waiting?.scriptURL || "");
            return url.toLowerCase().includes("onesignal");
          })
          .map((r) => r.unregister())
      );
    }
  } catch {}

  try {
    // 2) clear localStorage keys that look like OneSignal
    if (typeof localStorage !== "undefined") {
      for (const k of Object.keys(localStorage)) {
        if (k.toLowerCase().includes("onesignal")) localStorage.removeItem(k);
      }
    }
  } catch {}

  try {
    // 3) clear OneSignal indexedDB if possible
    const anyIDB: any = indexedDB as any;
    if (anyIDB?.databases) {
      const dbs = await anyIDB.databases();
      await Promise.all(
        (dbs || [])
          .filter((d: any) => String(d?.name || "").toLowerCase().includes("onesignal"))
          .map(
            (d: any) =>
              new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(d.name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              })
          )
      );
    }
  } catch {}
}

/**
 * Inicializa OneSignal (Web SDK v16) e vincula o usuário logado ao External ID.
 * Também exibe um banner global para o usuário se inscrever no push.
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

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;

  // 1) Init OneSignal (once)
  useEffect(() => {
    if (!appId) {
      console.warn("[OneSignal] VITE_ONESIGNAL_APP_ID não configurado");
      return;
    }

    if (didInit) return;
    didInit = true;

    withOneSignal(async (OneSignal) => {
      try {
        
await OneSignal.init({
  appId,
  // dev
  allowLocalhostAsSecureOrigin: true,

  /**
   * IMPORTANT: este app já tem um Service Worker do PWA (/sw.js) no escopo raiz.
   * Para não conflitar (só pode existir 1 SW por escopo), registramos o OneSignal
   * em um escopo isolado: /onesignal/
   *
   * Os arquivos estão em public/onesignal/OneSignalSDKWorker.js e ...UpdaterWorker.js
   */
  serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
  serviceWorkerUpdaterPath: "/onesignal/OneSignalSDKUpdaterWorker.js",
  serviceWorkerParam: { scope: "/onesignal/" },
} as any);

        setReady(true);

        try {
          setPermission(typeof window !== "undefined" ? Notification.permission : "default");
        } catch {
          // ignore
        }

        try {
          const currentOptIn = !!OneSignal?.User?.PushSubscription?.optedIn;
          setOptedIn(currentOptIn);
        } catch {
          // ignore
        }
      } catch (e: any) {
  console.error("[OneSignal] init falhou", e);

  const msg = String(e?.message || e || "");
  if (msg.toLowerCase().includes("appid") && msg.toLowerCase().includes("doesn't match")) {
    console.warn("[OneSignal] AppID mismatch detectado. Limpando SW/cache e tentando novamente...");
    await cleanupOneSignalAppIdMismatch();
    try {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
        serviceWorkerUpdaterPath: "/onesignal/OneSignalSDKUpdaterWorker.js",
        serviceWorkerParam: { scope: "/onesignal/" },
      } as any);

      setReady(true);
      setPermission(typeof window !== "undefined" ? Notification.permission : "default");
      setOptedIn(!!OneSignal?.User?.PushSubscription?.optedIn);
      return;
    } catch (e2) {
      console.error("[OneSignal] re-init falhou após cleanup", e2);
    }
  }

  // se init falhar, libera re-tentativa em reload (evita travar)
  didInit = false;
}
    });
  }, [appId]);

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
      } catch {
        // ignore
      }
      withOneSignal((OneSignal) => {
        try {
          if (!mounted) return;
          setOptedIn(!!OneSignal?.User?.PushSubscription?.optedIn);
        } catch {
          // ignore
        }
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
    if (!ready) return;

    if (!appId) {
      toast({
        variant: "destructive",
        title: "OneSignal não configurado",
        description: "Configure VITE_ONESIGNAL_APP_ID no Netlify.",
      });
      return;
    }

    await withOneSignal(async (OneSignal) => {
      try {
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
  const shouldShowBanner = !!user?.id && ready && !dismissed && !optedIn;

  if (!shouldShowBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Ativar notificações</div>
          <div className="text-xs text-muted-foreground">
            Receba push de <b>mensagens</b>, <b>menções</b>, <b>comentários</b>, <b>pedidos de amizade</b>, <b>chamar atenção</b> e <b>posts de amigos</b>.
          </div>
          {permission === "denied" && (
            <div className="text-xs text-destructive">
              Permissão bloqueada. Libere nas configurações do navegador/SO e recarregue a página.
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
            Agora não
          </Button>
          <Button size="sm" onClick={handleSubscribe} disabled={permission === "denied"}>
            Ativar
          </Button>
        </div>
      </div>
    </div>
  );
}
