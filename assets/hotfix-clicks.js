// HOTFIX: Corrige problema de cliques no Handsontable
// Este arquivo garante que todos os cliques funcionem corretamente

console.log('✅ Hotfix de cliques carregado!');

// 1. Remove qualquer overlay invisível que possa estar bloqueando
document.addEventListener('DOMContentLoaded', function() {
  // Garante que modais não interfiram
  const modais = ['configModal', 'monthNavigatorModal', 'compareSelectorModal', 'oficinaModal'];
  modais.forEach(id => {
    const modal = document.getElementById(id);
    if (modal && modal.classList.contains('hidden')) {
      modal.style.display = 'none';
    }
  });
});

// 2. Observer para garantir que modais ocultos não bloqueiem clicks
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.attributeName === 'class') {
      const target = mutation.target;
      if (target.classList.contains('hidden')) {
        target.style.display = 'none';
        target.style.pointerEvents = 'none';
      } else {
        target.style.display = '';
        target.style.pointerEvents = '';
      }
    }
  });
});

// Observa todos os modais
setTimeout(() => {
  const modais = ['configModal', 'monthNavigatorModal', 'compareSelectorModal', 'oficinaModal'];
  modais.forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
      observer.observe(modal, { attributes: true });
      if (modal.classList.contains('hidden')) {
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
      }
    }
  });
}, 500);

// 3. Fix específico para Handsontable dropdowns
setTimeout(() => {
  const spreadsheet = document.getElementById('spreadsheet');
  if (spreadsheet) {
    spreadsheet.style.position = 'relative';
    spreadsheet.style.zIndex = '10';
    console.log('✅ Handsontable z-index corrigido');
  }
  
  // Garante que dropdowns do Handsontable tenham z-index alto
  const style = document.createElement('style');
  style.innerHTML = `
    .handsontable .htDropdownMenu,
    .handsontable .listbox,
    .htContextMenu {
      z-index: 9999 !important;
    }
    
    .handsontable td.htInvalid {
      background-color: #fee !important;
    }
    
    /* Garante que célula ativa seja clicável */
    .handsontable td.current {
      cursor: pointer !important;
      pointer-events: auto !important;
    }
    
    /* Remove qualquer bloqueio */
    #page-data {
      position: relative !important;
      z-index: 1 !important;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ Estilos de correção aplicados');
}, 1000);

// 4. Debug: Mostra se clique está sendo interceptado
let clickDebug = false; // Mude para true para debugar

if (clickDebug) {
  document.addEventListener('click', function(e) {
    console.log('👆 Clique detectado em:', e.target);
    console.log('Classes:', e.target.className);
    console.log('Z-index:', window.getComputedStyle(e.target).zIndex);
  }, true);
}

// 5. Corrige problema de dropdowns não abrindo
setTimeout(() => {
  if (typeof hot !== 'undefined' && hot) {
    console.log('✅ Handsontable instância detectada');
    
    // Force re-render para garantir que tudo funcione
    try {
      hot.render();
      console.log('✅ Handsontable re-renderizado');
    } catch(e) {
      console.warn('⚠️ Erro ao re-renderizar:', e);
    }
  }
}, 2000);

console.log('🚀 Hotfix de cliques completamente ativo!');
