// ============ NOVAS FUNCIONALIDADES ============

// ============ 1. BUSCA INTELIGENTE COM LUPA ============
let searchHighlightedRows = [];

function initSmartSearch() {
  const searchBar = document.getElementById('smart-search-input');
  const searchBtn = document.getElementById('smart-search-btn');
  const clearBtn = document.getElementById('clear-search-btn');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', performSmartSearch);
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearSmartSearch);
  }
  
  if (searchBar) {
    searchBar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSmartSearch();
    });
  }
}

function performSmartSearch() {
  const query = document.getElementById('smart-search-input').value.toLowerCase().trim();
  
  if (!query) {
    Swal.fire('Atenção', 'Digite algo para buscar', 'warning');
    return;
  }
  
  const data = hot.getData();
  searchHighlightedRows = [];
  
  data.forEach((row, idx) => {
    const rowText = row.join(' ').toLowerCase();
    if (rowText.includes(query)) {
      searchHighlightedRows.push(idx);
    }
  });
  
  if (searchHighlightedRows.length === 0) {
    Swal.fire('Sem resultados', `Nenhum registro encontrado para "${query}"`, 'info');
    return;
  }
  
  // Vai para o primeiro resultado
  go('data');
  setTimeout(() => {
    hot.selectCell(searchHighlightedRows[0], 0);
    hot.scrollViewportTo(searchHighlightedRows[0], 0);
    
    document.getElementById('search-counter').innerText = `${searchHighlightedRows.length} resultado(s) encontrado(s)`;
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${searchHighlightedRows.length} resultado(s)`,
      timer: 2000,
      showConfirmButton: false
    });
  }, 100);
}

function clearSmartSearch() {
  document.getElementById('smart-search-input').value = '';
  document.getElementById('search-counter').innerText = '';
  searchHighlightedRows = [];
}

// ============ 2. DESTAQUE DA LINHA INTEIRA AO EDITAR ============
function initRowHighlight() {
  if (!hot) return;
  
  hot.addHook('afterSelection', (row, column, row2, column2) => {
    // Remove destaque anterior
    const allRows = document.querySelectorAll('.htCore tbody tr');
    allRows.forEach(tr => tr.classList.remove('selected-row-highlight'));
    
    // Adiciona destaque na linha selecionada
    setTimeout(() => {
      const selectedRows = document.querySelectorAll('.htCore tbody tr');
      if (selectedRows[row]) {
        selectedRows[row].classList.add('selected-row-highlight');
      }
    }, 10);
  });
}

// ============ 3. ATALHOS DE TECLADO ============
const KEYBOARD_SHORTCUTS = {
  'ctrl+s': saveCurrentMonthWithChecks,
  'ctrl+f': () => document.getElementById('smart-search-input')?.focus(),
  'ctrl+n': () => { if (hot) hot.alter('insert_row_below'); },
  'ctrl+d': duplicateCurrentEvent,
  'ctrl+e': exportData,
  'f1': () => go('dash'),
  'f2': () => go('data'),
  'f3': () => go('compare'),
  'f4': () => go('juridico'),
  'f5': () => go('oficinas'),
  'ctrl+shift+d': toggleDarkMode,
  'ctrl+shift+c': () => addCommentToCurrentRow(),
  'ctrl+shift+t': () => addTagToCurrentRow()
};

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const key = [];
    if (e.ctrlKey) key.push('ctrl');
    if (e.shiftKey) key.push('shift');
    if (e.altKey) key.push('alt');
    key.push(e.key.toLowerCase());
    
    const shortcut = key.join('+');
    
    if (KEYBOARD_SHORTCUTS[shortcut]) {
      e.preventDefault();
      KEYBOARD_SHORTCUTS[shortcut]();
    }
  });
}

function showKeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'Ctrl + S', desc: 'Salvar mês atual' },
    { key: 'Ctrl + F', desc: 'Focar na busca' },
    { key: 'Ctrl + N', desc: 'Nova linha' },
    { key: 'Ctrl + D', desc: 'Duplicar evento' },
    { key: 'Ctrl + E', desc: 'Exportar dados' },
    { key: 'F1 - F5', desc: 'Navegar entre páginas' },
    { key: 'Ctrl + Shift + D', desc: 'Modo escuro' },
    { key: 'Ctrl + Shift + C', desc: 'Adicionar comentário' },
    { key: 'Ctrl + Shift + T', desc: 'Adicionar tag' }
  ];
  
  const html = `
    <div class="text-left">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-100">
            <th class="p-2 text-left font-bold">Atalho</th>
            <th class="p-2 text-left font-bold">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${shortcuts.map(s => `
            <tr class="border-b">
              <td class="p-2 font-mono font-bold text-blue-600">${s.key}</td>
              <td class="p-2">${s.desc}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  Swal.fire({
    title: '⌨️ Atalhos de Teclado',
    html: html,
    width: '600px',
    confirmButtonText: 'Entendi'
  });
}

// ============ 4. CONTADOR DE LINHAS ============
function updateRowCounter() {
  const data = hot?.getData() || [];
  const totalRows = data.filter(r => r[0]).length;
  
  const counter = document.getElementById('row-counter');
  if (counter) {
    counter.innerHTML = `📊 <b>${totalRows}</b> evento(s)`;
  }
}

// ============ 7. MODO ESCURO ============
// 🔥 IMPORTANTE: Carrega preferência IMEDIATAMENTE
let darkModeEnabled = localStorage.getItem('darkMode') === 'true';

// 🔥 Aplica modo escuro IMEDIATAMENTE (antes de qualquer outra coisa)
if (darkModeEnabled) {
  document.body.classList.add('dark-mode');
}

function toggleDarkMode() {
  darkModeEnabled = !darkModeEnabled;
  localStorage.setItem('darkMode', darkModeEnabled);
  applyDarkMode();
  
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: darkModeEnabled ? '🌙 Modo Escuro Ativado' : '☀️ Modo Claro Ativado',
    timer: 1500,
    showConfirmButton: false
  });
}

function applyDarkMode() {
  if (darkModeEnabled) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  const icon = document.getElementById('dark-mode-icon');
  if (icon) {
    icon.innerText = darkModeEnabled ? '☀️' : '🌙';
  }
}

// ============ 8. NOTIFICAÇÕES PUSH ============
let notifications = [];

function showNotification(title, message, type = 'info') {
  const notification = {
    id: Date.now(),
    title: title,
    message: message,
    type: type,
    timestamp: new Date().toLocaleString('pt-BR')
  };
  
  notifications.unshift(notification);
  
  // Limita a 50 notificações
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  
  // Toast notification
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: type,
    title: title,
    text: message,
    timer: 3000,
    showConfirmButton: false
  });
  
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (badge) {
    const unread = notifications.filter(n => !n.read).length;
    badge.innerText = unread > 0 ? unread : '';
    badge.style.display = unread > 0 ? 'inline-block' : 'none';
  }
}

function showNotificationPanel() {
  const html = `
    <div class="text-left max-h-96 overflow-y-auto">
      ${notifications.length === 0 ? '<p class="text-gray-400 text-center py-8">Nenhuma notificação</p>' : ''}
      ${notifications.map(n => `
        <div class="border-b p-3 hover:bg-gray-50">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="font-bold text-sm">${n.title}</p>
              <p class="text-xs text-gray-600 mt-1">${n.message}</p>
            </div>
            <span class="text-xs text-gray-400">${n.timestamp}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  Swal.fire({
    title: '🔔 Notificações',
    html: html,
    width: '600px',
    confirmButtonText: 'Fechar'
  });
  
  notifications.forEach(n => n.read = true);
  updateNotificationBadge();
}

// ============ 9. EXPORTAR EXCEL FORMATADO ============
function exportFormattedExcel() {
  Swal.fire({
    title: '📊 Exportar Excel',
    html: '<p>Gerando arquivo Excel formatado...</p>',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
  
  setTimeout(() => {
    const data = hot.getData().filter(r => r[0]);
    
    // Adiciona cabeçalhos
    const headers = [
      'ASSOCIAÇÃO', 'BENEFICIÁRIO', 'EVENTO TIPO', 'VEÍCULO', 'PLACA', 'DATA OFICINA',
      'OFICINA', 'COTA', 'MÃO DE OBRA', 'PEÇAS', 'OUTRAS DESPESAS', 'GASTOS TOTAIS',
      'SITUAÇÃO', 'CAUSADOR', 'JURÍDICO STATUS', 'DT ENVIO JURÍDICO', 'VALOR A RECUPERAR', 'OBS JURÍDICO'
    ];
    
    const csv = [headers, ...data]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Eventos_${monthLabel(currentYear, currentMonth)}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    Swal.fire('✅ Exportado!', 'Arquivo Excel criado com sucesso', 'success');
  }, 500);
}

// ============ 10. AUTOCOMPLETE INTELIGENTE ============
let autocompleteCache = {
  veiculos: [],
  placas: [],
  beneficiarios: []
};

function updateAutocompleteCache() {
  const data = hot?.getData() || [];
  
  const veiculos = new Set();
  const placas = new Set();
  const beneficiarios = new Set();
  
  data.forEach(row => {
    if (row[3]) veiculos.add(row[3].toString().trim());
    if (row[4]) placas.add(row[4].toString().trim());
    if (row[1]) beneficiarios.add(row[1].toString().trim());
  });
  
  autocompleteCache.veiculos = Array.from(veiculos).slice(0, 100);
  autocompleteCache.placas = Array.from(placas).slice(0, 100);
  autocompleteCache.beneficiarios = Array.from(beneficiarios).slice(0, 100);
}

// ============ 12. COMENTÁRIOS POR EVENTO ============
let eventComments = JSON.parse(localStorage.getItem('eventComments') || '{}');

function addCommentToCurrentRow() {
  const selected = hot.getSelected();
  if (!selected) {
    Swal.fire('Atenção', 'Selecione uma linha primeiro', 'warning');
    return;
  }
  
  const row = selected[0][0];
  const placa = normalizePlaca(hot.getDataAtCell(row, 4));
  
  if (!placa) {
    Swal.fire('Atenção', 'Esta linha não possui placa', 'warning');
    return;
  }
  
  const commentKey = `${monthKey(currentYear, currentMonth)}_${placa}`;
  const existingComments = eventComments[commentKey] || [];
  
  Swal.fire({
    title: '💬 Comentário',
    input: 'textarea',
    inputLabel: `Adicionar comentário para ${placa}`,
    inputPlaceholder: 'Digite seu comentário aqui...',
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    preConfirm: (comment) => {
      if (!comment || !comment.trim()) {
        Swal.showValidationMessage('Digite um comentário');
        return false;
      }
      return comment;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const comment = {
        text: result.value,
        timestamp: new Date().toLocaleString('pt-BR'),
        user: 'Usuário'
      };
      
      if (!eventComments[commentKey]) {
        eventComments[commentKey] = [];
      }
      
      eventComments[commentKey].push(comment);
      localStorage.setItem('eventComments', JSON.stringify(eventComments));
      
      showNotification('Comentário Adicionado', `Comentário salvo para ${placa}`, 'success');
    }
  });
}

function viewCommentsForRow(row) {
  const placa = normalizePlaca(hot.getDataAtCell(row, 4));
  
  if (!placa) {
    Swal.fire('Atenção', 'Esta linha não possui placa', 'warning');
    return;
  }
  
  const commentKey = `${monthKey(currentYear, currentMonth)}_${placa}`;
  const comments = eventComments[commentKey] || [];
  
  if (comments.length === 0) {
    Swal.fire('Sem comentários', `Nenhum comentário para ${placa}`, 'info');
    return;
  }
  
  const html = `
    <div class="text-left max-h-96 overflow-y-auto">
      ${comments.map(c => `
        <div class="border-b p-3 bg-gray-50 rounded mb-2">
          <p class="text-sm">${c.text}</p>
          <p class="text-xs text-gray-400 mt-1">${c.user} • ${c.timestamp}</p>
        </div>
      `).join('')}
    </div>
  `;
  
  Swal.fire({
    title: `💬 Comentários - ${placa}`,
    html: html,
    width: '600px',
    confirmButtonText: 'Fechar'
  });
}

// ============ 15. DUPLICAR EVENTO ============
function duplicateCurrentEvent() {
  const selected = hot.getSelected();
  if (!selected) {
    Swal.fire('Atenção', 'Selecione uma linha para duplicar', 'warning');
    return;
  }
  
  const row = selected[0][0];
  const rowData = hot.getDataAtRow(row);
  
  if (!rowData[0]) {
    Swal.fire('Atenção', 'Selecione uma linha válida', 'warning');
    return;
  }
  
  Swal.fire({
    title: 'Duplicar Evento?',
    text: 'Uma cópia será criada abaixo desta linha',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sim, duplicar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      const newRow = [...rowData];
      newRow[4] = ''; // Limpa a placa
      
      hot.alter('insert_row_below', row, 1);
      hot.populateFromArray(row + 1, 0, [newRow]);
      hot.selectCell(row + 1, 0);
      
      saveCurrentMonth();
      showNotification('Evento Duplicado', 'Registro copiado com sucesso', 'success');
    }
  });
}

// ============ 16. TAGS PERSONALIZADAS ============
let eventTags = JSON.parse(localStorage.getItem('eventTags') || '{}');
const availableTags = ['Urgente', 'Revisão', 'Aguardando', 'Prioridade', 'Verificar', 'Pendente'];

function addTagToCurrentRow() {
  const selected = hot.getSelected();
  if (!selected) {
    Swal.fire('Atenção', 'Selecione uma linha primeiro', 'warning');
    return;
  }
  
  const row = selected[0][0];
  const placa = normalizePlaca(hot.getDataAtCell(row, 4));
  
  if (!placa) {
    Swal.fire('Atenção', 'Esta linha não possui placa', 'warning');
    return;
  }
  
  const tagKey = `${monthKey(currentYear, currentMonth)}_${placa}`;
  const currentTags = eventTags[tagKey] || [];
  
  const html = `
    <div class="text-left">
      <p class="mb-3 text-sm">Selecione ou crie uma tag:</p>
      <div class="flex flex-wrap gap-2 mb-3">
        ${availableTags.map(tag => {
          const active = currentTags.includes(tag);
          return `
            <button 
              onclick="toggleTagSelection('${tag}')" 
              class="tag-btn ${active ? 'active' : ''}"
              id="tag-btn-${tag}"
            >
              ${tag}
            </button>
          `;
        }).join('')}
      </div>
      <input 
        type="text" 
        id="custom-tag-input" 
        class="w-full border-2 border-gray-300 rounded px-3 py-2"
        placeholder="Ou digite uma tag personalizada..."
      >
    </div>
  `;
  
  Swal.fire({
    title: '🏷️ Tags',
    html: html,
    width: '500px',
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    didOpen: () => {
      window.selectedTags = [...currentTags];
    },
    preConfirm: () => {
      const customTag = document.getElementById('custom-tag-input').value.trim();
      if (customTag && !window.selectedTags.includes(customTag)) {
        window.selectedTags.push(customTag);
      }
      return window.selectedTags;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      eventTags[tagKey] = result.value;
      localStorage.setItem('eventTags', JSON.stringify(eventTags));
      showNotification('Tags Atualizadas', `Tags salvas para ${placa}`, 'success');
    }
  });
}

window.toggleTagSelection = function(tag) {
  if (!window.selectedTags) window.selectedTags = [];
  
  const idx = window.selectedTags.indexOf(tag);
  if (idx >= 0) {
    window.selectedTags.splice(idx, 1);
  } else {
    window.selectedTags.push(tag);
  }
  
  const btn = document.getElementById(`tag-btn-${tag}`);
  if (btn) {
    btn.classList.toggle('active');
  }
};

function getTagsForRow(row) {
  const placa = normalizePlaca(hot.getDataAtCell(row, 4));
  if (!placa) return [];
  
  const tagKey = `${monthKey(currentYear, currentMonth)}_${placa}`;
  return eventTags[tagKey] || [];
}

// ============ 14. MAPA DE OFICINAS ============
function showOficinasMap() {
  Swal.fire({
    title: '🗺️ Mapa de Oficinas',
    html: '<p class="text-sm text-gray-600 mb-4">Visualização geográfica das oficinas cadastradas</p><div id="map-container" style="width:100%; height:400px; background:#f0f0f0; border-radius:8px; display:flex; align-items:center; justify-content:center;"><p class="text-gray-400">Mapa requer integração com Google Maps API</p></div>',
    width: '800px',
    confirmButtonText: 'Fechar'
  });
}

// ============ 15. CALCULADORA DE CUSTOS ============
function showCostCalculator() {
  Swal.fire({
    title: '💰 Calculadora de Custos',
    html: `
      <div class="text-left space-y-3">
        <div>
          <label class="block text-sm font-bold mb-1">Cota (R$):</label>
          <input type="number" id="calc-cota" class="w-full border-2 border-gray-300 rounded px-3 py-2" step="0.01" value="0">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1">Mão de Obra (R$):</label>
          <input type="number" id="calc-mao" class="w-full border-2 border-gray-300 rounded px-3 py-2" step="0.01" value="0">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1">Peças (R$):</label>
          <input type="number" id="calc-pecas" class="w-full border-2 border-gray-300 rounded px-3 py-2" step="0.01" value="0">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1">Outras Despesas (R$):</label>
          <input type="number" id="calc-outras" class="w-full border-2 border-gray-300 rounded px-3 py-2" step="0.01" value="0">
        </div>
        <div class="bg-blue-50 p-4 rounded-lg mt-4">
          <p class="text-lg font-bold text-blue-900">Total: <span id="calc-total">R$ 0,00</span></p>
        </div>
      </div>
    `,
    width: '500px',
    showCancelButton: true,
    confirmButtonText: 'Inserir na linha selecionada',
    cancelButtonText: 'Fechar',
    didOpen: () => {
      const inputs = ['calc-cota', 'calc-mao', 'calc-pecas', 'calc-outras'];
      inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', updateCalcTotal);
        }
      });
    },
    preConfirm: () => {
      return {
        cota: parseFloat(document.getElementById('calc-cota').value) || 0,
        mao: parseFloat(document.getElementById('calc-mao').value) || 0,
        pecas: parseFloat(document.getElementById('calc-pecas').value) || 0,
        outras: parseFloat(document.getElementById('calc-outras').value) || 0
      };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const selected = hot.getSelected();
      if (selected) {
        const row = selected[0][0];
        hot.setDataAtCell(row, 7, result.value.cota);
        hot.setDataAtCell(row, 8, result.value.mao);
        hot.setDataAtCell(row, 9, result.value.pecas);
        hot.setDataAtCell(row, 10, result.value.outras);
        showNotification('Valores Inseridos', 'Custos calculados e inseridos', 'success');
      }
    }
  });
}

function updateCalcTotal() {
  const cota = parseFloat(document.getElementById('calc-cota').value) || 0;
  const mao = parseFloat(document.getElementById('calc-mao').value) || 0;
  const pecas = parseFloat(document.getElementById('calc-pecas').value) || 0;
  const outras = parseFloat(document.getElementById('calc-outras').value) || 0;
  
  const total = cota + mao + pecas + outras;
  
  const totalEl = document.getElementById('calc-total');
  if (totalEl) {
    totalEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

// ============ INICIALIZAÇÃO ============
function initAllFeatures() {
  initSmartSearch();
  initRowHighlight();
  initKeyboardShortcuts();
  applyDarkMode(); // Atualiza o ícone
  updateRowCounter();
  updateAutocompleteCache();
  
  // Atualiza contador quando dados mudam
  if (hot) {
    hot.addHook('afterChange', () => {
      updateRowCounter();
      updateAutocompleteCache();
    });
  }
  
  console.log('✅ Todas as novas funcionalidades carregadas!');
  console.log(`🌙 Modo escuro: ${darkModeEnabled ? 'ATIVADO' : 'DESATIVADO'}`);
}

// Exporta funções globais
window.initAllFeatures = initAllFeatures;
window.performSmartSearch = performSmartSearch;
window.clearSmartSearch = clearSmartSearch;
window.toggleDarkMode = toggleDarkMode;
window.showNotificationPanel = showNotificationPanel;
window.exportFormattedExcel = exportFormattedExcel;
window.addCommentToCurrentRow = addCommentToCurrentRow;
window.duplicateCurrentEvent = duplicateCurrentEvent;
window.addTagToCurrentRow = addTagToCurrentRow;
window.showOficinasMap = showOficinasMap;
window.showCostCalculator = showCostCalculator;
window.showKeyboardShortcutsHelp = showKeyboardShortcutsHelp;
