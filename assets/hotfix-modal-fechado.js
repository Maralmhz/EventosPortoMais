/**
 * HOTFIX ULTRA v2: Remove modal + Debug + Bloqueia Swal
 * Adicionado em: Setembro 2026 - Correcao urgente
 */

(function() {
  'use strict';
  
  console.log('🔴 [HOTFIX ULTRA v2] INICIANDO...');
  console.log('🔴 [HOTFIX] User agent:', navigator.userAgent);
  console.log('🔴 [HOTFIX] URL atual:', window.location.href);
  
  // Bloqueia SweetAlert2
  if (window.Swal) {
    console.log('🔴 [HOTFIX] Swal detectado, bloqueando...');
    var swalOriginal = window.Swal;
    window.Swal = {
      fire: function(opts) {
        console.log('🔴 [HOTFIX] Swal.fire BLOQUEADO:', opts);
        return Promise.resolve({isConfirmed: false, isDismissed: true});
      },
      mixin: function() { return this; },
      showLoading: function() { console.log('[HOTFIX] Swal.showLoading bloqueado'); },
      close: function() { console.log('[HOTFIX] Swal.close chamado'); },
      isVisible: function() { return false; },
      getContainer: function() { return null; }
    };
  }
  
  // Funcao para destruir modais
  function destruirModais() {
    console.log('🔵 [HOTFIX] Executando destruirModais()');
    
    const seletores = [
      '.modal', '.modal-overlay', '#modalOverlay', '.modal-backdrop',
      '.modal-content', '#pinModal', '#loginModal', '#configModal',
      '#modal', '.modal-dialog', '.modal-container', '#modalContainer',
      '.modal-wrapper', '#modalWrapper', '.modal-outer', '#modalOuter',
      '.swal2-container', '.swal2-popup', '.swal2-overlay',
      '.Toastify', '.toast', '.notification',
      '.overlay', '#overlay', '.backdrop', '#backdrop',
      '.popup', '#popup', '.dialog', '#dialog'
    ];
    
    const todosModais = document.querySelectorAll(seletores.join(', '));
    console.log('🔵 [HOTFIX] Modais encontrados:', todosModais.length);
    
    todosModais.forEach(function(modal, idx) {
      if (modal.tagName === 'TEMPLATE' || modal.tagName === 'SCRIPT') return;
      
      console.log('🔴 [HOTFIX] Destruindo modal #' + idx + ':', modal.tagName, modal.id || modal.className);
      
      try {
        // Forca display none
        modal.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;position:fixed!important;top:-9999px!important;left:-9999px!important;z-index:-9999!important;';
        
        // Remove classes
        if (modal.classList) {
          modal.classList.remove('ativo', 'open', 'aberto', 'active', 'visible', 'show', 'fade');
          modal.classList.add('hidden', 'fechado');
        }
      } catch(e) {
        console.error('🔴 [HOTFIX] Erro:', e);
      }
    });
    
    // Remove overlays
    const overlays = document.querySelectorAll('.modal-backdrop, .overlay, #overlay, .backdrop, .swal2-container');
    overlays.forEach(function(overlay) {
      if (overlay.parentNode) {
        console.log('🔴 [HOTFIX] Removendo overlay:', overlay.className);
        try {
          overlay.parentNode.removeChild(overlay);
        } catch(e) {}
      }
    });
    
    // Libera scroll
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.height = 'auto';
    
    console.log('🟢 [HOTFIX] Conclusao - Modais destruidos!');
  }
  
  // Executa IMEDIATAMENTE
  destruirModais();
  
  // Executa no DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('🔵 [HOTFIX] DOMContentLoaded');
      destruirModais();
    });
  }
  
  // Executa no load
  window.addEventListener('load', function() {
    console.log('🔵 [HOTFIX] Window load');
    destruirModais();
  });
  
  // Executa em intervalos
  setTimeout(destruirModais, 50);
  setTimeout(destruirModais, 100);
  setTimeout(destruirModais, 200);
  setTimeout(destruirModais, 500);
  setTimeout(destruirModais, 1000);
  setTimeout(destruirModais, 2000);
  
  // MutationObserver
  try {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            const className = String(node.className || '');
            const id = String(node.id || '');
            if (className.includes('modal') || className.includes('Modal') || className.includes('overlay') || className.includes('swal2') ||
                id.includes('modal') || id.includes('Modal') || id.includes('overlay') || id.includes('swal2')) {
              console.log('🔴 [HOTFIX] Modal dinamico detectado:', node.tagName, className || id);
              if (node.parentNode) {
                try { node.parentNode.removeChild(node); } catch(e) {}
              }
            }
          }
        });
      });
    });
    
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    console.log('🟢 [HOTFIX] MutationObserver ativado');
  } catch(e) {
    console.log('🟡 [HOTFIX] MutationObserver erro:', e);
  }
  
  // ESC fecha modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      console.log('🔵 [HOTFIX] ESC pressionado');
      destruirModais();
    }
  });
  
  console.log('🟢 [HOTFIX ULTRA v2] FINALIZADO');
})();
