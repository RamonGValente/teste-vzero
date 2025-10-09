(function(){
  const yearEl = document.getElementById('y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const config = window.__PWA_GATEWAY_CONFIG__ || {};
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(()=>{}); }
  const APP_ENTRY = config.appEntryPath || "/";
  const installBtn = document.getElementById('btn-install');
  const instructionsBtn = document.getElementById('btn-instrucoes');
  const hint = document.getElementById('install-hint');
  const env = document.getElementById('env');
  const status = document.getElementById('status');
  const compat = document.getElementById('compat');

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.startsWith('android-app://');
  }

  function platformInfo(){
    const ua = navigator.userAgent || '';
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua);
    const isEdge = /Edg/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isFirefox = /Firefox/i.test(ua);
    const isDesktop = !(/Mobile|Android|iPhone|iPad|iPod/i.test(ua));
    return { isiOS, isAndroid, isChrome, isEdge, isSafari, isFirefox, isDesktop };
  }

  function updateEnv(){
    const p = platformInfo();
    env.textContent = [
      p.isAndroid ? 'Android' : (p.isiOS ? 'iOS' : (p.isDesktop ? 'Desktop' : 'Outro')),
      p.isChrome ? 'Chrome' : (p.isEdge ? 'Edge' : (p.isSafari ? 'Safari' : (p.isFirefox ? 'Firefox' : 'Outro')))
    ].join(' · ');
  }

  if (isStandalone()) {
    try { window.location.replace(APP_ENTRY); } catch { window.location.href = APP_ENTRY; }
    return;
  }

  updateEnv();
  status.textContent = 'Não instalado';
  compat.textContent = 'Avaliando suporte…';

  let deferredPrompt = null;
  let supportsInstall = false;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    supportsInstall = true;
    if (installBtn) {
      installBtn.disabled = false;
      installBtn.textContent = 'Instalar o App (PWA)';
      if (hint) hint.textContent = 'Seu navegador suporta instalação PWA.';
      compat.textContent = 'Instalação via botão disponível';
    }
  });

  window.addEventListener('appinstalled', () => {
    status.textContent = 'Instalado';
    if (hint) hint.textContent = 'App instalado! Abra pelo atalho da tela inicial.';
  });

  function openInstructions(){
    const p = platformInfo();
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    const close = document.getElementById('modal-close');
    function show(msg){
      body.innerHTML = msg;
      modal.classList.add('open');
    }
    close.onclick = () => modal.classList.remove('open');
    modal.querySelector('.modal-backdrop').onclick = () => modal.classList.remove('open');

    if (p.isiOS && p.isSafari) {
      compat.textContent = 'Instalação manual via iOS Safari';
      show('No iPhone/iPad, toque em <strong>Compartilhar</strong> (ícone com seta) e escolha <strong>Adicionar à Tela de Início</strong>. Em seguida, abra pelo atalho criado para usar o app.');
    } else if (p.isAndroid && (p.isChrome || p.isEdge)) {
      if (!supportsInstall) {
        compat.textContent = 'Instalação via menu do navegador';
        show('No Android, abra o menu do navegador (⋮) e toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.');
      } else {
        compat.textContent = 'Instalação via botão disponível';
        show('Se o botão de instalar não aparecer, atualize a página ou use o menu (⋮) → <strong>Instalar app</strong>.');
      }
    } else if (p.isDesktop && (p.isChrome || p.isEdge)) {
      compat.textContent = 'Instalação via ícone da barra de endereço';
      show('No desktop, procure o <strong>ícone de instalação</strong> na barra de endereço e clique em <strong>Instalar</strong>.');
    } else if (p.isFirefox) {
      compat.textContent = 'Instalação via menu (quando disponível)';
      show('No Firefox, use o menu do navegador e procure por <strong>Instalar Site como Aplicativo</strong>. Em algumas versões do Android, use <em>Adicionar à tela inicial</em>.');
    } else {
      compat.textContent = 'Consulte as instruções do seu navegador';
      show('Seu navegador pode exigir um caminho alternativo. Procure no menu por <strong>Instalar</strong> ou <strong>Adicionar à tela inicial</strong>.');
    }
  }

  if (instructionsBtn) instructionsBtn.addEventListener('click', openInstructions);

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      const p = platformInfo();
      if (p.isiOS && p.isSafari) {
        openInstructions();
        return;
      }
      if (!deferredPrompt) {
        openInstructions();
        return;
      }
      installBtn.disabled = false;  // typo prevention doesn't matter in runtime here
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          status.textContent = 'Instalando…';
          if (hint) hint.textContent = 'Instalando. Abra pelo atalho quando concluir.';
        } else {
          status.textContent = 'Instalação cancelada';
          if (hint) hint.textContent = 'Você pode tentar novamente ou seguir as instruções.';
          installBtn.disabled = false;
        }
      } catch (err) {
        status.textContent = 'Falha ao iniciar instalação';
        if (hint) hint.textContent = 'Não foi possível disparar a instalação. Use as instruções do seu navegador.';
        installBtn.disabled = false;
      }
      deferredPrompt = null;
    });
  }

  setTimeout(() => {
    if (!supportsInstall) {
      compat.textContent = 'Instalação via instruções';
      if (hint) hint.textContent = 'Seu navegador não expõe o botão de instalar. Use as instruções específicas do dispositivo.';
      if (installBtn) installBtn.disabled = false;
    }
  }, 1600);
})();