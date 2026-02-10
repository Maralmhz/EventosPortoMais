// ============ MELHORIAS DE UX ============
// 1. Busca com lupa (PLACA, NOME, VEÍCULO, etc)
// 2. Destaque da linha inteira quando editando
// 3. Atalhos de teclado

console.log('✨ Melhorias de UX carregadas!');

// ============ 🔍 SISTEMA DE BUSCA GLOBAL ============

function criarBarraDeBusca() {
  // Verifica se já existe
  if (document.getElementById('global-search-bar')) return;
  
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  
  // Cria container de busca
  const searchContainer = document.createElement('div');
  searchContainer.id = 'global-search-bar';
  searchContainer.className = 'flex items-center gap-2';
  searchContainer.innerHTML = `
    <div class="relative">
      <input 
        type="text" 
        id="search-input" 
        placeholder="🔍 Buscar placa, veículo, beneficiário, oficina..." 
        class="border-2 border-gray-300 rounded-lg px-4 py-2 pl-10 focus:border-blue-500 focus:outline-none"
        style="min-width: 350px;"
      >
      <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">🔍</span>
      <button 
        id="clear-search" 
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold hidden"
        style="font-size: 20px;"
      >×</button>
    </div>
    <div id="search-results-badge" class="hidden text-xs font-bold bg-blue-500 text-white px-3 py-1 rounded-full"></div>
  `;
  
  // Insere após o título
  const titleDiv = topbar.querySelector('.flex.items-center.gap-3');
  if (titleDiv) {
    titleDiv.parentNode.insertBefore(searchContainer, titleDiv.nextSibling);
  }
  
  // Event listeners
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  const resultsBadge = document.getElementById('search-results-badge');
  
  let searchTimeout;
  
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.trim();
    
    // Mostra/esconde botão limpar
    if (query) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
      resultsBadge.classList.add('hidden');
      limparFiltros();
      return;
    }
    
    // Debounce
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      buscarNaPlanilha(query);
    }, 300);
  });
  
  clearBtn.addEventListener('click', function() {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    resultsBadge.classList.add('hidden');
    limparFiltros();
    searchInput.focus();
  });
  
  // Atalho Ctrl+F
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
}

function buscarNaPlanilha(query) {
  if (!hot || !query) return;
  
  const data = hot.getData();
  const matches = [];
  const queryLower = query.toLowerCase();
  
  // Busca em múltiplas colunas
  data.forEach((row, index) => {
    if (!row[0]) return; // Ignora linhas vazias
    
    const searchFields = [
      row[0],  // ASSOCIAÇÃO
      row[1],  // BENEFICIÁRIO
      row[2],  // EVENTO TIPO
      row[3],  // VEÍCULO
      row[4],  // PLACA
      row[6],  // OFICINA
      row[12], // SITUAÇÃO
      row[13]  // CAUSADOR
    ].map(v => (v || '').toString().toLowerCase());
    
    const found = searchFields.some(field => field.includes(queryLower));
    
    if (found) {
      matches.push(index);
    }
  });
  
  // Mostra resultados
  const resultsBadge = document.getElementById('search-results-badge');
  if (matches.length > 0) {
    resultsBadge.textContent = `${matches.length} resultado(s)`;
    resultsBadge.classList.remove('hidden');
    
    // Vai para a página de dados
    go('data');
    
    // Aguarda renderização
    setTimeout(() => {
      // Destaca primeira linha encontrada
      hot.selectCell(matches[0], 0);
      hot.scrollViewportTo(matches[0], 0);
      
      // Destaca todas as linhas encontradas
      destacarLinhasEncontradas(matches);
    }, 200);
  } else {
    resultsBadge.textContent = 'Nenhum resultado';
    resultsBadge.classList.remove('hidden');
  }
}

function destacarLinhasEncontradas(indices) {
  if (!hot) return;
  
  // Remove destaques anteriores
  const rows = document.querySelectorAll('.htCore tbody tr');
  rows.forEach(row => {
    row.style.backgroundColor = '';
  });
  
  // Adiciona destaque amarelo claro
  indices.forEach(index => {
    setTimeout(() => {
      const rows = document.querySelectorAll('.htCore tbody tr');
      if (rows[index]) {
        rows[index].style.backgroundColor = '#fef3c7';
        rows[index].style.transition = 'background-color 0.3s ease';
      }
    }, 50);
  });
}

function limparFiltros() {
  if (!hot) return;
  
  // Remove destaques
  const rows = document.querySelectorAll('.htCore tbody tr');
  rows.forEach(row => {
    row.style.backgroundColor = '';
  });
  
  // Limpa filtros do Handsontable
  try {
    const filters = hot.getPlugin('filters');
    if (filters) {
      filters.clearConditions();
      filters.filter();
    }
  } catch(e) {
    console.warn('Erro ao limpar filtros:', e);
  }
  
  hot.render();
}

// ============ 🎯 DESTAQUE DE LINHA ATIVA ============

function ativarDestaqueDeLinha() {
  if (!hot) return;
  
  // Adiciona estilo CSS
  const style = document.createElement('style');
  style.innerHTML = `
    /* Destaque da linha ativa */
    .handsontable tbody tr.highlighted-row {
      background-color: #dbeafe !important;
      box-shadow: inset 0 0 0 2px #3b82f6 !important;
    }
    
    .handsontable tbody tr.highlighted-row td {
      background-color: #dbeafe !important;
      font-weight: 600 !important;
    }
    
    .handsontable tbody tr.highlighted-row td.current {
      background-color: #bfdbfe !important;
      border: 2px solid #2563eb !important;
    }
    
    /* Transição suave */
    .handsontable tbody tr {
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
    }
    
    /* Hover na linha */
    .handsontable tbody tr:hover {
      background-color: #f3f4f6 !important;
    }
    
    .handsontable tbody tr:hover td {
      background-color: #f3f4f6 !important;
    }
  `;
  document.head.appendChild(style);
  
  // Event listener para seleção de célula
  hot.addHook('afterSelection', function(row, column, row2, column2) {
    // Remove destaque anterior
    const rows = document.querySelectorAll('.htCore tbody tr');
    rows.forEach(r => r.classList.remove('highlighted-row'));
    
    // Adiciona destaque na linha ativa
    setTimeout(() => {
      const rows = document.querySelectorAll('.htCore tbody tr');
      if (rows[row]) {
        rows[row].classList.add('highlighted-row');
      }
    }, 10);
  });
  
  // Também destaca ao começar a editar
  hot.addHook('afterBeginEditing', function(row, column) {
    const rows = document.querySelectorAll('.htCore tbody tr');
    rows.forEach(r => r.classList.remove('highlighted-row'));
    
    if (rows[row]) {
      rows[row].classList.add('highlighted-row');
    }
  });
  
  console.log('✅ Destaque de linha ativa ativado!');
}

// ============ ⌨️ ATALHOS DE TECLADO ============

function ativarAtalhosDeTeclado() {
  document.addEventListener('keydown', function(e) {
    // Ctrl+S = Salvar
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentMonthWithChecks();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '💾 Salvo!',
        timer: 1500,
        showConfirmButton: false
      });
    }
    
    // Ctrl+D = Dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      go('dash');
    }
    
    // Ctrl+E = Editar dados
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      go('data');
    }
    
    // Ctrl+J = Jurídico
    if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
      e.preventDefault();
      go('juridico');
    }
    
    // Ctrl+O = Oficinas
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      go('oficinas');
    }
    
    // Esc = Fecha modais
    if (e.key === 'Escape') {
      const modais = ['configModal', 'monthNavigatorModal', 'compareSelectorModal', 'oficinaModal'];
      modais.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
        }
      });
    }
  });
  
  console.log('✅ Atalhos de teclado ativados!');
}

// ============ 📊 CONTADOR DE LINHAS ============

function adicionarContadorDeLinhas() {
  if (!hot) return;
  
  const spreadsheet = document.getElementById('spreadsheet');
  if (!spreadsheet) return;
  
  // Cria contador
  const counter = document.createElement('div');
  counter.id = 'row-counter';
  counter.className = 'text-sm font-bold text-gray-600 mb-2';
  counter.innerHTML = '📊 <span id="row-count">0</span> linhas';
  
  spreadsheet.parentNode.insertBefore(counter, spreadsheet);
  
  // Atualiza contador
  function atualizarContador() {
    if (!hot) return;
    const data = hot.getData();
    const count = data.filter(row => row[0]).length; // Linhas não vazias
    const el = document.getElementById('row-count');
    if (el) el.textContent = count;
  }
  
  // Event listeners
  hot.addHook('afterChange', atualizarContador);
  hot.addHook('afterLoadData', atualizarContador);
  
  atualizarContador();
  console.log('✅ Contador de linhas adicionado!');
}

// ============ 🚀 INICIALIZAÇÃO ============

setTimeout(() => {
  criarBarraDeBusca();
  ativarDestaqueDeLinha();
  ativarAtalhosDeTeclado();
  adicionarContadorDeLinhas();
  
  console.log('🎉 Todas as melhorias de UX foram ativadas!');
  console.log('💡 Atalhos disponíveis:');
  console.log('  Ctrl+F = Buscar');
  console.log('  Ctrl+S = Salvar');
  console.log('  Ctrl+D = Dashboard');
  console.log('  Ctrl+E = Editar dados');
  console.log('  Ctrl+J = Jurídico');
  console.log('  Ctrl+O = Oficinas');
  console.log('  Esc = Fechar modais');
}, 1000);
