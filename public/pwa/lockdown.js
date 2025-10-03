(function(){
  function isStandalone(){
    try{ if (navigator.standalone) return true; }catch(e){}
    try{ return matchMedia('(display-mode: standalone)').matches; }catch(e){}
    return false;
  }
  if (!isStandalone()) {
    document.documentElement.classList.add('pwa-locked');
    const reason = 'O Undoing só funciona no app instalado (PWA). Abra pelo atalho da tela inicial.';
    // Block basic network channels while em navegador
    const _fetch = window.fetch; window.fetch = function(){ return Promise.reject(new Error(reason)); };
    function BlockXHR(){ throw new Error(reason); }
    BlockXHR.DONE=4; BlockXHR.UNSENT=0; BlockXHR.OPENED=1; BlockXHR.HEADERS_RECEIVED=2; BlockXHR.LOADING=3;
    window.XMLHttpRequest = BlockXHR;
    window.WebSocket = function(){ throw new Error(reason); };
    window.EventSource = function(){ throw new Error(reason); };
  }
})();