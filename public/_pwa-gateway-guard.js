/* Redireciona navegadores (não PWA) para /pwa-gateway logo no início do ciclo de vida */
(function(){
  try {
    var BYPASS = typeof window !== 'undefined' && (window.location.search.includes('no-pwa-gateway') || window.location.hash.includes('no-pwa-gateway'));
    if (BYPASS) return;
    var isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || (document.referrer || '').startsWith('android-app://');
    var isGateway = window.location.pathname.startsWith('/pwa-gateway');
    if (!isStandalone && !isGateway) {
      // Evita loops infinitos e preserva rota original para pós-instalação (opcional)
      var target = '/pwa-gateway/';
      window.location.replace(target);
    }
  } catch (e) {}
})();