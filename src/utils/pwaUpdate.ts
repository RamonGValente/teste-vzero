import { registerSW } from 'virtual:pwa-register';

/**
 * PWA registration + auto-update (sem botão/alerta de versão).
 *
 * O fluxo é simples:
 * - registra o Service Worker no início da app
 * - após o login, chamamos `autoUpdateAfterLogin()` para:
 *   - pedir para o browser verificar update do SW
 *   - se achar update (updatefound/controllerchange), recarrega 1 vez
 *
 * Isso mantém o usuário sempre na versão mais recente sem precisar clicar em nada.
 */

let initialized = false;

export function initPWAUpdate() {
  if (initialized) return;
  initialized = true;

  // Registra o SW gerado pelo vite-plugin-pwa
  registerSW({
    immediate: true,
  });
}

function oncePerSession(key: string): boolean {
  try {
    if (sessionStorage.getItem(key) === '1') return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

export async function autoUpdateAfterLogin() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // Só roda uma vez por sessão (evita loops de reload)
  if (!oncePerSession('pwa:autoUpdateAfterLogin:ran')) return;

  try {
    // Só faz sentido se a página já está controlada por SW
    if (!navigator.serviceWorker.controller) return;

    const registration = await navigator.serviceWorker.ready;

    let updateFound = false;

    const onUpdateFound = () => {
      updateFound = true;
    };

    registration.addEventListener('updatefound', onUpdateFound, { once: true });

    // Pede para o browser checar updates do SW
    await registration.update();

    // Se não encontrou update, termina sem recarregar
    if (!updateFound) return;

    // Se encontrou update, aguarda o novo SW controlar a página e recarrega
    await new Promise<void>((resolve) => {
      let done = false;
      const timeout = window.setTimeout(() => {
        if (done) return;
        done = true;
        resolve();
      }, 4000);

      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          if (done) return;
          done = true;
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
    });

    // Evita recarregar mais de 1 vez na mesma sessão
    if (!oncePerSession('pwa:autoUpdateAfterLogin:reloaded')) return;

    window.location.reload();
  } catch {
    // Se falhar, não quebra o app.
  }
}
