(function(){
  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.startsWith('android-app://');
  }
  if (isStandalone()) return;
  // If hash opt-out is present, don't show overlay (useful for SEO crawlers)
  if (window.location.hash.includes('no-pwa-gateway')) return;

  var style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/_pwa-gateway-overlay.css';
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'pwa-gw-overlay';
  wrap.innerHTML = '<div class="pwa-gw-box">'
    + '<h2 class="pwa-gw-title">Você está na versão navegador. Este sistema funciona somente pelo App (PWA)</h2>'
    + '<p class="pwa-gw-sub">Para garantir sigilo, privacidade e a melhor experiência de nosso sistema avançado, o acesso é exclusivo pelo aplicativo PWA.</p>'
    + '<div class="pwa-gw-actions">'
    +   '<a class="pwa-gw-btn pwa-gw-btn-primary" href="/pwa-gateway/" rel="nofollow">Instalar / Abrir instruções</a>'
    +   '<button class="pwa-gw-btn pwa-gw-btn-ghost" id="pwa-gw-continue">Continuar mesmo assim</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(wrap);
  document.getElementById('pwa-gw-continue').addEventListener('click', function(){
    document.body.removeChild(wrap);
  });
})();