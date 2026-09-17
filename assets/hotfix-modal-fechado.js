/**
 * HOTFIX: Garante que modais comecem fechados
 * Adicionado em: Setembro 2026
 * 
 * Este script fecha automaticamente qualquer modal aberto
 * quando a página carrega, corrigindo o bug do modal fixo na tela.
 */

(function() {
  'use strict';
  
  // Executa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fecharModais);
  } else {
    fecharModais();
  }
  
  function fecharModais() {
    // Seleciona todos os elementos que podem ser modais
    const modais = document.querySelectorAll(
      '.modal, .modal-overlay, #modalOverlay, .modal-backdrop, ' +
      '.modal-content, #pinModal, #loginModal, #configModal'
    );
    
    modais.forEach(function(modal) {
      // Remove classes que deixam o modal visivel
      modal.classList.remove('ativo', 'open', 'aberto', 'active', 'visible');
      
      // Adiciona classes que escondem o modal
      modal.classList.add('fechado', 'hidden');
      
      // Forca display none via style inline
      if (modal.style) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
      }
    });
    
    // Remove overlay de fundo se existir
    const overlays = document.querySelectorAll('.modal-backdrop, .overlay, #overlay');
    overlays.forEach(function(overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('ativo', 'open', 'aberto');
    });
    
    // Libera o scroll do body
    document.body.style.overflow = '';
    document.body.style.position = '';
    
    console.log('[HOTFIX] Modais fechados automaticamente');
  }
  
  // Tambem fecha modais ao pressionar ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      fecharModais();
    }
  });
  
})();
