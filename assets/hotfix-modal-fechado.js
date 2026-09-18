/**
 * HOTFIX ULTRA: Remove modal do DOM completamente
 * Adicionado em: Setembro 2026 - Correcao urgente
 * 
 * Este script REMOVE fisicamente os modais do DOM
 * e previne qualquer tentativa de abertura automatica.
 */

(function() {
  'use strict';
  
  console.log('[HOTFIX ULTRA] Iniciando remocao de modais...');
  
  // Funcao para destruir modais
  function destruirModais() {
    // Seleciona TODOS os elementos que podem ser modais
    const seletores = [
      '.modal', '.modal-overlay', '#modalOverlay', '.modal-backdrop',
      '.modal-content', '#pinModal', '#loginModal', '#configModal',
      '#modal', '.modal-dialog', '.modal-container', '#modalContainer',
      '.modal-wrapper', '#modalWrapper', '.modal-outer', '#modalOuter',
      '[class*="modal"]', '[id*="modal"]', '[class*="Modal"]', '[id*="Modal"]',
      '.overlay', '#overlay', '.backdrop', '#backdrop',
      '.popup', '#popup', '.dialog', '#dialog'
    ];
    
    const todosModais = document.querySelectorAll(seletores.join(', '));
    
    todosModais.forEach(function(modal) {
      // Nao remove o modal se for um template ou script
      if (modal.tagName === 'TEMPLATE' || modal.tagName === 'SCRIPT') return;
      
      console.log('[HOTFIX ULTRA] Destruindo modal:', modal.id || modal.className);
      
      // 1. Remove todos os eventos
      const novoModal = modal.cloneNode(false);
      if (modal.parentNode) {
        modal.parentNode.replaceChild(novoModal, modal);
      }
      
      // 2. Forca display none absoluto
      try {
        novoModal.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;position:fixed!important;top:-9999px!important;left:-9999px!important;z-index:-9999!important;';
        
        // 3. Remove todas as classes
        novoModal.className = '';
        
        // 4. Remove todos os atributos exceto id (se existir)
        const attrs = Array.from(novoModal.attributes);
        attrs.forEach(function(attr) {
          if (attr.name !== 'id') {
            novoModal.removeAttribute(attr.name);
          }
        });
      } catch(e) {
        console.error('[HOTFIX ULTRA] Erro ao estilizar modal:', e);
      }
    });
    
    // Remove overlays de fundo
    const overlays = document.querySelectorAll('.modal-backdrop, .overlay, #overlay, .backdrop, .fade');
    overlays.forEach(function(overlay) {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    // 5. Previne abertura futura de modais
    window.abrirModal = function() { console.log('[HOTFIX] Modal bloqueado'); return false; };
    window.openModal = function() { console.log('[HOTFIX] Modal bloqueado'); return false; };
    window.showModal = function() { console.log('[HOTFIX] Modal bloqueado'); return false; };
    window.exibirModal = function() { console.log('[HOTFIX] Modal bloqueado'); return false; };
    
    // 6. Libera scroll do body
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.height = 'auto';
    
    console.log('[HOTFIX ULTRA] Modais destruidos com sucesso!');
  }
  
  // Executa IMEDIATAMENTE
  destruirModais();
  
  // Executa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', destruirModais);
  }
  
  // Executa quando a pagina carregar completamente
  window.addEventListener('load', destruirModais);
  
  // Executa apos 100ms para pegar modais dinamicos
  setTimeout(destruirModais, 100);
  setTimeout(destruirModais, 500);
  setTimeout(destruirModais, 1000);
  
  // Intercepta MutationObserver para fechar modais que aparecerem depois
  try {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && // Element node
              (node.className && (String(node.className).includes('modal') || String(node.className).includes('overlay'))) ||
               (node.id && (String(node.id).includes('modal') || String(node.id).includes('overlay'))))) {
            console.log('[HOTFIX ULTRA] Modal detectado e removido:', node.id || node.className);
            if (node.parentNode) {
              node.parentNode.removeChild(node);
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } catch(e) {
    console.log('[HOTFIX ULTRA] MutationObserver nao suportado:', e);
  }
  
  // Fecha com ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      destruirModais();
    }
  });
  
})();
