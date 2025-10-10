// v11 Installer overlay with config, update flow and better UX
(function(){

  function gateOverlay(){
    return `
      <div class="pwa-overlay" role="dialog" aria-modal="true">
        <div class="pwa-modal">
          <div class="pwa-brand" style="align-items:flex-start;gap:6px;">
            <img src="pwa/logo.png" alt="Undoing logo" style="width:24px;height:24px;border-radius:6px;margin-left:4px;"/>
          </div>
          <h1>Undoing</h1>
          <div class="pwa-lead">Instale o app para continuar</div>
          <div class="pwa-sub">Por segurança e privacidade, o Undoing funciona somente no app instalado (PWA).<br/>Instale agora para continuar.</div>
          <div class="pwa-actions">
            <button class="pwa-btn pwa-btn-primary pwa-install">Instalar agora (recomendado)</button>
          </div>
          <div class="pwa-help" style="margin-top:12px;text-align:center;opacity:.8;">Disponível em Android, iOS e Desktop. O passo exato depende do seu navegador.</div>
        </div>
      </div>`;
  }



  const FORCE_BROWSER_OVERLAY = true; // gate fixo no navegador
  const CONFIG_URL = '/pwa/config.json';
  const PROTOCOL = 'web+undoing:open';

  const LS = {
    installed: 'pwa.installer.v11.installed',
    dismissedAt: 'pwa.installer.v11.dismissedAt'
  };

  // ---------- helpers ----------
  function isStandalone(){ try{ if (navigator.standalone) return true; }catch{} try{ return matchMedia('(display-mode: standalone)').matches; }catch{} return false; }
  function setInstalled(){ try{ localStorage.setItem(LS.installed,'1'); }catch{} }
  function isInstalledFlag(){ try{ return localStorage.getItem(LS.installed)==='1'; }catch{ return false; } }
  function toast(msg, ms=2800){ const t=document.createElement('div'); t.className='pwa-toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }

  async function loadConfig(){ try{ const r = await fetch(CONFIG_URL); return await r.json(); } catch(e) { return null; } }

  // ---------- overlay ----------
  function htmlOverlay(cfg){
    const b = (cfg?.overlay?.benefits||[]).map(x=>`<li>• ${x}</li>`).join('');
    return `
      <div class="pwa-overlay" role="dialog" aria-modal="true">
        <div class="pwa-modal">
          <div class="pwa-brand">
            <img src="pwa/logo.png" alt="Logo" />
            <div class="title">{appName}</div>
          </div>
          <h2>{title}</h2>
          <div class="pwa-sub">{subtitle}</div>
          <ul class="pwa-benefits">{benefits}</ul>
          <div class="pwa-actions">
            <button class="pwa-btn pwa-btn-primary pwa-open" style="display:none">{primaryOpen}</button>
            <button class="pwa-btn pwa-btn-primary pwa-install">{primaryInstall}</button>
            <button class="pwa-btn pwa-btn-ghost pwa-help">{help}</button>
          </div>
          <div class="pwa-help">{footnote}</div>
          <div class="pwa-steps" id="pwa-steps">
            <div class="pwa-tipbar"><strong>Como instalar pelo seu navegador</strong></div>
            <ol class="pwa-steps-list"></ol>
          </div>
        </div>
      </div>`;
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt = e; });
  window.addEventListener('appinstalled',()=>{ setInstalled(); try{ window.location.href = PROTOCOL; }catch{} });

  function stepsForPlatform(){
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isChrome = /chrome|crios/.test(ua) && !/edg\//.test(ua);
    const isEdge = /edg\//.test(ua);
    const isFirefox = /firefox/.test(ua);
    const desktop = !/iphone|ipad|ipod|android/.test(ua);
    const s = [];
    if (isAndroid && (isChrome||isEdge||isFirefox)){ s.push('Toque em ⋮ no canto superior.'); s.push('Escolha <b>Instalar aplicativo</b>.'); s.push('Confirme para adicionar.'); }
    else if (isIOS){ s.push('Toque em <b>Compartilhar</b>.'); s.push('Selecione <b>Adicionar à Tela de Início</b>.'); s.push('Confirme em <b>Adicionar</b>.'); }
    else if (desktop && isChrome){ s.push('Clique no ícone <b>Instalar</b> na barra de endereço.'); }
    else if (desktop && isEdge){ s.push('Menu ⋯ → <b>Instalar este site como aplicativo</b>.'); }
    else { s.push('Use a opção <b>Instalar</b> do seu navegador.'); }
    return s;
  }

  async function buildAndShowOverlay(){
    const cfg = (await loadConfig()) || {"appName": "Undoing", "tagline": "R\u00e1pido. Seguro. Em modo app.", "brandColor": "#22c55e", "brandDark": "#0f172a", "overlay": {"title": "Use o Undoing como app", "subtitle": "Por seguran\u00e7a e privacidade, o Undoing funciona apenas instalado como PWA.", "benefits": ["Tela cheia e atalho na tela inicial", "Mais desempenho e menos distra\u00e7\u00f5es", "Permiss\u00f5es e armazenamento isolados", "Suporte a funcionamento offline"], "primaryInstall": "Instalar agora", "primaryOpen": "Abrir no app", "secondaryHelp": "Como instalar", "footnote": "Dica: no Chrome e Edge, h\u00e1 um \u00edcone de instalar na barra de endere\u00e7o. No iOS, use \u201cAdicionar \u00e0 Tela de In\u00edcio\u201d."}};
    // Template merge
    const tpl = htmlOverlay(cfg)
      .replace('{appName}', cfg.appName || 'App')
      .replace('{title}', cfg.overlay?.title || 'Instalar aplicativo')
      .replace('{subtitle}', cfg.overlay?.subtitle || 'Melhor experiência no modo app.')
      .replace('{primaryInstall}', cfg.overlay?.primaryInstall || 'Instalar agora')
      .replace('{primaryOpen}', cfg.overlay?.primaryOpen || 'Abrir no app')
      .replace('{help}', cfg.overlay?.secondaryHelp || 'Como instalar')
      .replace('{footnote}', cfg.overlay?.footnote || 'Veja o ícone de instalar na barra de endereço.')
      .replace('{benefits}', (cfg.overlay?.benefits||[]).map(x=>`<li>• ${x}</li>`).join(''));
    document.body.insertAdjacentHTML('beforeend', tpl);
    document.documentElement.classList.add('pwa-locked');
    const ov = document.querySelector('.pwa-overlay');
    ov.classList.add('pwa-visible');
    const btnInstall = ov.querySelector('.pwa-install');
    const btnOpen = ov.querySelector('.pwa-open');
    const btnHelp = ov.querySelector('.pwa-help');

    // Toggle buttons
    if (isInstalledFlag()) { btnOpen.style.display='inline-block'; btnInstall.style.display='none'; }
    else { btnOpen.style.display='none'; btnInstall.style.display='inline-block'; }

    btnOpen.addEventListener('click', ()=>{ try{ location.href = PROTOCOL; }catch{} });
    btnInstall.addEventListener('click', doInstall);
    btnHelp.addEventListener('click', showHelp);
  }

  async function doInstall(){
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const ch = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (ch && ch.outcome==='accepted') { setInstalled(); return; }
    }
    showHelp();
  }

  function showHelp(){
    const steps = stepsForPlatform();
    const wrap = document.getElementById('pwa-steps');
    const list = wrap.querySelector('.pwa-steps-list');
    list.innerHTML = steps.map(s=>`<li>${s}</li>`).join('');
    wrap.classList.add('visible');
    toast('Siga os passos para instalar.');
  }

  // SW registration + update banner (apenas no PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try { await navigator.serviceWorker.register('/service-worker.js', {scope:'/'}); } catch(e){}
      try {
        navigator.serviceWorker.addEventListener('controllerchange', ()=>toast('App atualizado. Reiniciando...'));
      } catch(e){}
    });
  }

  // Entry
  document.addEventListener('DOMContentLoaded', async () => {
    if (isStandalone()) { setInstalled(); document.documentElement.classList.remove('pwa-locked'); return; }
    if (FORCE_BROWSER_OVERLAY) await buildAndShowOverlay();
  });

})();