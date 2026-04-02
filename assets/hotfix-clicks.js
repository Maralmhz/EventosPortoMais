// HOTFIX: Corrige problema de cliques/teclado no Handsontable
// Mantém apenas ajustes de interação (sem dependência de Firebase/Supabase)

console.log('✅ Hotfix de interação Handsontable carregado!');

const HOTFIX_MODAL_IDS = ['configModal', 'monthNavigatorModal', 'compareSelectorModal', 'oficinaModal', 'pin-login-overlay', 'login-overlay', 'sb-pin-overlay'];

function syncHiddenModalState(modal) {
  if (!modal) return;
  const isHidden = modal.classList.contains('hidden') || modal.style.display === 'none';
  if (isHidden) {
    modal.style.display = 'none';
    modal.style.pointerEvents = 'none';
  } else {
    modal.style.display = '';
    modal.style.pointerEvents = 'auto';
  }
}

function enforceHandsontableInteractivity() {
  const spreadsheet = document.getElementById('spreadsheet');
  if (!spreadsheet) return;

  spreadsheet.style.position = 'relative';
  spreadsheet.style.zIndex = '10';
  spreadsheet.style.pointerEvents = 'auto';

  const holders = spreadsheet.querySelectorAll('.ht_master, .wtHolder, .handsontable, .htCore');
  holders.forEach((el) => {
    el.style.pointerEvents = 'auto';
  });

  if (!spreadsheet.dataset.hotfixBound) {
    spreadsheet.addEventListener('mousedown', () => {
      if (window.hot && typeof window.hot.listen === 'function') {
        window.hot.listen();
      }
    });
    spreadsheet.dataset.hotfixBound = '1';
  }
}

function neutralizeBlockingOverlays() {
  HOTFIX_MODAL_IDS.forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) syncHiddenModalState(modal);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  neutralizeBlockingOverlays();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
        syncHiddenModalState(mutation.target);
      }
    });
  });

  HOTFIX_MODAL_IDS.forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
  });

  const style = document.createElement('style');
  style.innerHTML = `
    .handsontable .htDropdownMenu,
    .handsontable .listbox,
    .htContextMenu,
    .htEditor {
      z-index: 9999 !important;
      pointer-events: auto !important;
    }

    .handsontable td.current,
    .handsontable td.area,
    .handsontable td {
      cursor: text !important;
      pointer-events: auto !important;
    }

    #spreadsheet,
    #page-data,
    #page-data .card {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);

  setTimeout(enforceHandsontableInteractivity, 300);
  setTimeout(enforceHandsontableInteractivity, 1200);
  setTimeout(enforceHandsontableInteractivity, 2200);
});

console.log('🚀 Hotfix de interação ativo.');
