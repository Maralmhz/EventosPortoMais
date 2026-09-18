/**
 * HOTFIX ULTRA v3 - document.write CSS + intercepta scripts
 */
(function() {
  'use strict';
  
  console.log('🔴 [HOTFIX v3] INICIANDO COM document.write...');
  
  // CSS via document.write para carregar IMEDIATAMENTE
  document.write('<style>' +
    '.modal,.modal-overlay,#modalOverlay,.modal-backdrop,.modal-content,#pinModal,#loginModal,#configModal,' +
    '#modal,.modal-dialog,.modal-container,.swal2-container,.swal2-popup,.swal2-overlay,' +
    '.overlay,.backdrop,.popup,.dialog,.Toastify,.toast,.notification,' +
    '[class*="modal"],[id*="modal"],[class*="Modal"],[id*="Modal"],[class*="swal"],[id*="swal"]{' +
    'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;' +
    'position:fixed!important;top:-9999px!important;left:-9999px!important;z-index:-9999!important;' +
    '}' +
    'body,html{overflow:auto!important;position:static!important;height:auto!important;margin:0!important;padding:0!important;}' +
    '</style>');
  
  console.log('🔴 [HOTFIX v3] CSS injetado via document.write');
  
  // Bloqueia SweetAlert2
  window.Swal = {
    fire: function(opts) {
      console.log('🛡️ [HOTFIX] Swal.fire BLOQUEADO:', opts && opts.title || opts && opts.text || 'unknown');
      return Promise.resolve({isConfirmed: false, isDismissed: true});
    },
    mixin: function() { return this; },
    showLoading: function() {},
    close: function() {},
    isVisible: function() { return false; },
    getContainer: function() { return null; }
  };
  
  // Bloqueia alert/confirm/prompt
  window.alert = function() {};
  window.confirm = function() { return false; };
  window.prompt = function() { return null; };
  
  // Funcao destruir modais
  function destruirModais() {
    const s = '.modal,.modal-overlay,#modalOverlay,.modal-backdrop,.modal-content,#pinModal,#loginModal,#configModal,#modal,.modal-dialog,.modal-container,.swal2-container,.swal2-popup,.swal2-overlay,.overlay,.backdrop,.popup,.dialog';
    const modais = document.querySelectorAll(s);
    console.log('🔵 [HOTFIX] Modais encontrados:', modais.length);
    
    modais.forEach(function(m, i) {
      if (m.tagName === 'TEMPLATE' || m.tagName === 'SCRIPT') return;
      console.log('🔴 [HOTFIX] Destruindo modal #' + i, m.tagName, m.id || m.className);
      try {
        m.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;position:fixed!important;top:-9999px!important;left:-9999px!important;z-index:-9999!important;';
        if (m.classList) {
          m.classList.remove('ativo','open','aberto','active','visible','show','fade');
          m.classList.add('hidden','fechado');
        }
      } catch(e) {}
    });
    
    // Remove overlays
    document.querySelectorAll('.modal-backdrop,.overlay,#overlay,.backdrop,.swal2-container').forEach(function(o) {
      if (o.parentNode) try { o.parentNode.removeChild(o); } catch(e) {}
    });
    
    // Libera body
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.top = '';
    document.body.style.height = 'auto';
    
    console.log('🟢 [HOTFIX] Conclusao');
  }
  
  // Executa imediatamente
  destruirModais();
  
  // Executa em intervalos curtos
  setTimeout(destruirModais, 10);
  setTimeout(destruirModais, 50);
  setTimeout(destruirModais, 100);
  setTimeout(destruirModais, 200);
  setTimeout(destruirModais, 500);
  setTimeout(destruirModais, 1000);
  setTimeout(destruirModais, 2000);
  setTimeout(destruirModais, 5000);
  
  // DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('🔵 [HOTFIX] DOMContentLoaded');
      destruirModais();
    });
  }
  
  // Load
  window.addEventListener('load', function() {
    console.log('🔵 [HOTFIX] Window load');
    destruirModais();
  });
  
  // MutationObserver
  try {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1) {
            var c = String(n.className||''), id = String(n.id||'');
            if (c.includes('modal')||c.includes('Modal')||c.includes('overlay')||c.includes('swal2')||c.includes('Swal')||
                id.includes('modal')||id.includes('Modal')||id.includes('overlay')||id.includes('swal2')||id.includes('Swal')) {
              console.log('🔴 [HOTFIX] Modal dinamico:', n.tagName, c||id);
              if (n.parentNode) try { n.parentNode.removeChild(n); } catch(e) {}
            }
          }
        });
      });
    });
    observer.observe(document.body||document.documentElement, {childList:true,subtree:true});
    console.log('🟢 [HOTFIX] MutationObserver ativo');
  } catch(e) {}
  
  // ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { console.log('🔵 [HOTFIX] ESC'); destruirModais(); }
  });
  
  console.log('🟢 [HOTFIX v3] FINALIZADO');
})();
