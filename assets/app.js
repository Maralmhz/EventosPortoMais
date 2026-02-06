// ============ CONSTANTS ============
const JURIDICO_STATUS = ['NÃO INICIADO','EM COBRANÇA','COBRADO','ACORDO','NÃO COBRAR','RECUPERADO'];
const CAUSADOR_OPTS = ['ASSOCIADO','TERCEIRO','NÃO IDENTIFICADO'];
const EVENTO_TIPO_OPTS = ['VIDROS','ROUBO/FURTO','COLISÃO','OUTROS'];
const OFICINA_CATEGORIAS = [
  'Mecânica', 'Lanternagem', 'Lanternagem+Mecânica', 'Vidros', 'Ar-Condicionado',
  'Elétrica', 'Alinhamento/Balanceamento', 'Estofaria', 'Funilaria', 'Pintura'
];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ============ GLOBAL STATE ============
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let navigatorYear = currentYear;
let compareSelectorYear = currentYear;
let selectedMonthsForComparison = [];
let chartTipo, chartJuridico, chartCustos, chartCompareEventos, chartCompareCustos;
let firebaseDb = null;
let oficinas = [];
let currentOficinaId = null;
let hot = null;

// ============ BACKUP FUNCTIONS (MISSING) ============

function exportBackup() {
  exportAllBackup();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.toLowerCase().endsWith('.json')) {
    Swal.fire('Erro', 'Selecione um arquivo JSON', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.months || !Array.isArray(backup.months)) throw new Error('Inválido');
      
      let success = 0;
      backup.months.forEach(m => {
        if (m.year && (m.month || m.month_2026_undefined || m['month_2026_undefined.month'])) {
          const month = m.month || m.month_2026_undefined || m['month_2026_undefined.month'] || 1;
          const key = monthKey(m.year, month);
          const monthData = {
            year: m.year,
            month: month,
            monthLabel: m.monthLabel || monthLabel(m.year, month),
            saveDate: m.saveDate || new Date().toLocaleString('pt-BR'),
            data: m.data || [[""]]
          };
          localStorage.setItem(key, JSON.stringify(monthData));
          success++;
        }
      });
      
      if (backup.months.length > 0) {
        const latest = backup.months[0];
        const month = latest.month || latest.month_2026_undefined || latest['month_2026_undefined.month'] || 1;
        currentYear = latest.year;
        currentMonth = month;
        if (hot) hot.loadData(latest.data || [[""]]);
        setBadge();
        updateDashboard();
      }
      
      Swal.fire('Sucesso!', `${success} mês(es) importados.`, 'success');
    } catch (error) {
      Swal.fire('Erro', 'Falha ao importar: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function syncWithFirebase() {
  if (!firebaseDb) {
    Swal.fire('Firebase offline', 'Conexão não disponível', 'warning');
    return;
  }
  uploadToFirebase();
}

function checkFirebaseStatus() {
  if (!firebaseDb) {
    Swal.fire('Firebase offline', 'Conexão não está ativa', 'warning');
    return;
  }
  
  const months = getSavedMonths();
  Swal.fire({
    icon: 'success',
    title: 'Firebase Conectado',
    html: `<p>Meses locais: ${months.length}</p><p>Auto-sync ativo</p>`,
    confirmButtonText: 'OK'
  });
}

function clearLocalCache() {
  Swal.fire({
    title: 'Limpar tudo?',
    text: 'Esta ação NÃO pode ser desfeita!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'SIM, LIMPAR',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ef4444'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.clear();
      oficinas = [];
      if (hot) hot.loadData([[""]]);
      Swal.fire('Limpo!', 'Cache removido. Recarregue a página.', 'success');
      setTimeout(() => location.reload(), 1500);
    }
  });
}

// ============ REST OF THE CODE ============
// (keeping all existing functions from the original file)

// ============ COMPARISON FUNCTIONS ============
function showCompareSelector() {
  compareSelectorYear = currentYear;
  selectedMonthsForComparison = [];
  renderCompareCalendar();
  updateSelectedMonthsBadges();
  document.getElementById('compareSelectorModal').classList.remove('hidden');
}

function closeCompareSelector() {
  document.getElementById('compareSelectorModal').classList.add('hidden');
}

function changeCompareSelectorYear(delta) {
  compareSelectorYear += delta;
  renderCompareCalendar();
}

function renderCompareCalendar() {
  document.getElementById('compare-year').innerText = compareSelectorYear;
  
  const savedMonths = getSavedMonths();
  const savedKeys = new Set(savedMonths.map(m => monthKey(m.year, m.month)));
  
  const calendar = document.getElementById('compare-calendar');
  calendar.innerHTML = MONTH_NAMES.map((name, idx) => {
    const month = idx + 1;
    const key = monthKey(compareSelectorYear, month);
    const hasData = savedKeys.has(key);
    const isSelected = selectedMonthsForComparison.some(s => s.year === compareSelectorYear && s.month === month);
    
    let classes = 'month-cell';
    if (isSelected) classes += ' selected';
    else if (hasData) classes += ' has-data';
    else classes += ' opacity-40 cursor-not-allowed';
    
    const onclick = hasData ? `toggleMonthSelection(${compareSelectorYear}, ${month})` : '';
    
    return `<div class="${classes}" onclick="${onclick}">${name}</div>`;
  }).join('');
}

function toggleMonthSelection(year, month) {
  const idx = selectedMonthsForComparison.findIndex(s => s.year === year && s.month === month);
  
  if (idx >= 0) {
    selectedMonthsForComparison.splice(idx, 1);
  } else {
    const key = monthKey(year, month);
    const md = JSON.parse(localStorage.getItem(key) || 'null');
    if (md && md.data) {
      selectedMonthsForComparison.push({ year, month, monthLabel: monthLabel(year, month), data: md.data });
    }
  }
  
  renderCompareCalendar();
  updateSelectedMonthsBadges();
}

function updateSelectedMonthsBadges() {
  const count = document.getElementById('selected-count');
  const badges = document.getElementById('selected-months-badges');
  
  if (count) count.innerText = selectedMonthsForComparison.length;
  
  if (badges) {
    if (selectedMonthsForComparison.length === 0) {
      badges.innerHTML = '<span class="text-xs text-gray-400">Nenhum mês selecionado ainda</span>';
    } else {
      badges.innerHTML = selectedMonthsForComparison
        .sort((a, b) => (a.year - b.year) || (a.month - b.month))
        .map(m => `
          <span class="inline-flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-bold">
            ${m.monthLabel}
            <button onclick="toggleMonthSelection(${m.year}, ${m.month})" class="hover:bg-purple-600 rounded-full px-1">×</button>
          </span>
        `).join('');
    }
  }
}

function generateComparison() {
  if (selectedMonthsForComparison.length < 2) {
    Swal.fire('Atenção', 'Selecione ao menos 2 meses para comparar.', 'warning');
    return;
  }
  
  closeCompareSelector();
  go('compare');
  
  setTimeout(() => {
    renderComparisonCharts();
    renderComparisonTable();
  }, 100);
}

function calculateMonthMetrics(data) {
  let total = 0, vidros = 0, roubo = 0, colisao = 0, outros = 0;
  let custoTotal = 0, custoVidros = 0, custoRoubo = 0, custoColisao = 0, custoOutros = 0;
  let finalizados = 0, acordos = 0, emAberto = 0;
  let terceiroCausador = 0, jurValor = 0;
  
  if (!data || !data.length) return {
    total, vidros, roubo, colisao, outros,
    custoTotal, custoVidros, custoRoubo, custoColisao, custoOutros,
    finalizados, acordos, emAberto, terceiroCausador, jurValor
  };
  
  data.forEach(r => {
    if (!r[0]) return;
    total++;
    
    const tipo = (r[2] || '').toString().toUpperCase().trim();
    const custo = parseFloat(r[11]) || 0;
    const status = (r[12] || '').toString().toUpperCase().trim();
    const causador = (r[13] || '').toString().toUpperCase().trim();
    const valorRecup = parseFloat(r[16]) || 0;
    
    custoTotal += custo;
    
    if (tipo === 'VIDROS') { vidros++; custoVidros += custo; }
    else if (tipo === 'ROUBO/FURTO') { roubo++; custoRoubo += custo; }
    else if (tipo === 'COLISÃO') { colisao++; custoColisao += custo; }
    else { outros++; custoOutros += custo; }
    
    if (status === 'FINALIZADO') finalizados++;
    if (status === 'ACORDO') acordos++;
    if (isOpenStatus(status)) emAberto++;
    
    if (causador === 'TERCEIRO') {
      terceiroCausador++;
      jurValor += valorRecup;
    }
  });
  
  return {
    total, vidros, roubo, colisao, outros,
    custoTotal, custoVidros, custoRoubo, custoColisao, custoOutros,
    finalizados, acordos, emAberto, terceiroCausador, jurValor
  };
}

function renderComparisonCharts() {
  const display = document.getElementById('compare-months-display');
  if (display) {
    display.innerHTML = `
      <div class="card">
        <p class="text-sm text-gray-700">
          <b>📋 Comparando ${selectedMonthsForComparison.length} meses:</b> 
          ${selectedMonthsForComparison.map(m => `<span class="font-bold text-purple-600">${m.monthLabel}</span>`).join(', ')}
        </p>
      </div>
    `;
  }
  
  const monthsData = selectedMonthsForComparison.map(m => ({
    label: m.monthLabel,
    metrics: calculateMonthMetrics(m.data)
  }));
  
  if (chartCompareEventos) chartCompareEventos.destroy();
  chartCompareEventos = new Chart(document.getElementById('chart-compare-eventos'), {
    type: 'bar',
    data: {
      labels: monthsData.map(m => m.label),
      datasets: [
        {
          label: 'Vidros',
          data: monthsData.map(m => m.metrics.vidros),
          backgroundColor: '#06b6d4'
        },
        {
          label: 'Roubo/Furto',
          data: monthsData.map(m => m.metrics.roubo),
          backgroundColor: '#a855f7'
        },
        {
          label: 'Colisão',
          data: monthsData.map(m => m.metrics.colisao),
          backgroundColor: '#f59e0b'
        },
        {
          label: 'Outros',
          data: monthsData.map(m => m.metrics.outros),
          backgroundColor: '#64748b'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, padding: 8 } },
        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, bodyFont: { size: 12 } }
      },
      scales: {
        x: { stacked: true, ticks: { font: { size: 10, weight: 'bold' } } },
        y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } } }
      },
      animation: { duration: 800, easing: 'easeInOutQuart' }
    }
  });
  
  if (chartCompareCustos) chartCompareCustos.destroy();
  chartCompareCustos = new Chart(document.getElementById('chart-compare-custos'), {
    type: 'line',
    data: {
      labels: monthsData.map(m => m.label),
      datasets: [
        {
          label: 'Custo Total (R$)',
          data: monthsData.map(m => m.metrics.custoTotal),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, padding: 8 } },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 10,
          bodyFont: { size: 12 },
          callbacks: {
            label: ctx => 'R$ ' + ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => 'R$ ' + v.toLocaleString('pt-BR'),
            font: { size: 10 }
          }
        }
      },
      animation: { duration: 800, easing: 'easeInOutQuart' }
    }
  });
}

function renderComparisonTable() {
  const table = document.getElementById('compare-table');
  if (!table) return;
  
  const monthsData = selectedMonthsForComparison.map(m => ({
    label: m.monthLabel,
    metrics: calculateMonthMetrics(m.data)
  }));
  
  const metrics = [
    { key: 'total', label: 'Total de Eventos' },
    { key: 'vidros', label: 'Vidros' },
    { key: 'roubo', label: 'Roubo/Furto' },
    { key: 'colisao', label: 'Colisão' },
    { key: 'outros', label: 'Outros' },
    { key: 'custoTotal', label: 'Custo Total', isCurrency: true },
    { key: 'finalizados', label: 'Finalizados' },
    { key: 'acordos', label: 'Acordos' },
    { key: 'emAberto', label: 'Em Aberto' },
    { key: 'terceiroCausador', label: '3º Causador' },
    { key: 'jurValor', label: 'Valor a Recuperar', isCurrency: true }
  ];
  
  const formatValue = (val, isCurrency) => {
    if (isCurrency) return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return val;
  };
  
  const calculateDelta = (current, previous, isCurrency) => {
    if (previous === 0) return '';
    const diff = current - previous;
    const pct = ((diff / previous) * 100).toFixed(1);
    const sign = diff >= 0 ? '+' : '';
    const cls = diff >= 0 ? 'delta-positive' : 'delta-negative';
    return `<span class="${cls}">${sign}${pct}%</span>`;
  };
  
  let html = '<thead><tr><th>Métrica</th>';
  monthsData.forEach(m => {
    html += `<th>${m.label}</th>`;
  });
  html += '<th>Variação</th></tr></thead><tbody>';
  
  metrics.forEach(metric => {
    html += '<tr>';
    html += `<td class="metric-label">${metric.label}</td>`;
    
    monthsData.forEach((m, idx) => {
      const val = m.metrics[metric.key];
      html += `<td>${formatValue(val, metric.isCurrency)}</td>`;
    });
    
    if (monthsData.length >= 2) {
      const lastVal = monthsData[monthsData.length - 1].metrics[metric.key];
      const prevVal = monthsData[monthsData.length - 2].metrics[metric.key];
      html += `<td>${calculateDelta(lastVal, prevVal, metric.isCurrency)}</td>`;
    } else {
      html += '<td>-</td>';
    }
    
    html += '</tr>';
  });
  
  html += '</tbody>';
  table.innerHTML = html;
}

async function exportComparison() {
  if (selectedMonthsForComparison.length < 2) {
    Swal.fire('Atenção', 'Selecione ao menos 2 meses para exportar a comparação.', 'warning');
    return;
  }
  
  Swal.fire({
    title: '📥 Exportar Comparação',
    html: '<p class="text-sm">Capturando gráficos e tabelas...</p>',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
  
  try {
    const pageCompare = document.getElementById('page-compare');
    
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });
    }
    
    const canvas = await html2canvas(pageCompare, {
      scale: 2,
      backgroundColor: '#f5f7fa',
      logging: false,
      useCORS: true
    });
    
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparacao_${selectedMonthsForComparison.map(m => m.monthLabel.replace(/ /g, '_')).join('_vs_')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      Swal.fire('✅ Exportado!', 'Comparação salva como PNG.', 'success');
    });
  } catch (error) {
    console.error('Erro ao exportar:', error);
    Swal.fire('Erro', 'Falha ao exportar comparação: ' + error.message, 'error');
  }
}

// ============ OFICINAS MANAGEMENT ============
function loadOficinas() {
  const stored = localStorage.getItem('oficinas');
  oficinas = stored ? JSON.parse(stored) : [];
}

function saveOficinasToStorage() {
  localStorage.setItem('oficinas', JSON.stringify(oficinas));
  if (firebaseDb) {
    firebaseDb.ref('oficinas').set(oficinas)
      .then(() => console.log('🏪 Oficinas sincronizadas'))
      .catch(err => console.error('Erro sync oficinas:', err));
  }
}

function getOficinasList() {
  return oficinas.map(o => o.nome).sort();
}

function updateHotOficinaDropdown() {
  if (!hot) return;
  const list = getOficinasList();
  hot.updateSettings({
    columns: [
      { type:'text' },
      { type:'dropdown', source:['ASSOCIADO','TERCEIRO'] },
      { type:'dropdown', source: EVENTO_TIPO_OPTS },
      { type:'text' },
      { type:'text' },
      { type:'date', dateFormat:'DD/MM/YYYY', correctFormat:true },
      { type:'dropdown', source: list },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' }, readOnly:true },
      { type:'dropdown', source:['FINALIZADO','EM ANDAMENTO','NEGADO','PENDENTE','ACORDO'] },
      { type:'dropdown', source: CAUSADOR_OPTS },
      { type:'dropdown', source: JURIDICO_STATUS },
      { type:'date', dateFormat:'DD/MM/YYYY', correctFormat:true },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'text' }
    ]
  });
}

function showAddOficinaModal() {
  currentOficinaId = null;
  document.getElementById('oficina-modal-title').innerText = '🏪 Nova Oficina';
  document.getElementById('of-nome').value = '';
  document.getElementById('of-cnpj').value = '';
  document.getElementById('of-telefone').value = '';
  document.getElementById('of-email').value = '';
  document.getElementById('of-endereco').value = '';
  document.querySelectorAll('.of-categoria').forEach(cb => cb.checked = false);
  document.getElementById('oficinaModal').classList.remove('hidden');
}

function editOficina(id) {
  const of = oficinas.find(o => o.id === id);
  if (!of) return;
  currentOficinaId = id;
  document.getElementById('oficina-modal-title').innerText = '✏️ Editar Oficina';
  document.getElementById('of-nome').value = of.nome;
  document.getElementById('of-cnpj').value = of.cnpj || '';
  document.getElementById('of-telefone').value = of.telefone || '';
  document.getElementById('of-email').value = of.email || '';
  document.getElementById('of-endereco').value = of.endereco || '';
  document.querySelectorAll('.of-categoria').forEach(cb => {
    cb.checked = of.categorias.includes(cb.value);
  });
  document.getElementById('oficinaModal').classList.remove('hidden');
}

function deleteOficina(id) {
  Swal.fire({
    title: 'Excluir oficina?',
    text: 'Esta ação não pode ser desfeita.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      oficinas = oficinas.filter(o => o.id !== id);
      saveOficinasToStorage();
      renderOficinasList();
      updateOficinaKPIs();
      updateHotOficinaDropdown();
      Swal.fire('Excluída!', 'Oficina removida com sucesso.', 'success');
    }
  });
}

function closeOficinaModal() {
  document.getElementById('oficinaModal').classList.add('hidden');
}

function saveOficina() {
  const nome = document.getElementById('of-nome').value.trim();
  if (!nome) {
    Swal.fire('Atenção', 'Nome da oficina é obrigatório.', 'warning');
    return;
  }

  const categorias = Array.from(document.querySelectorAll('.of-categoria:checked')).map(cb => cb.value);
  if (categorias.length === 0) {
    Swal.fire('Atenção', 'Selecione ao menos uma categoria de serviço.', 'warning');
    return;
  }

  const oficina = {
    id: currentOficinaId || Date.now(),
    nome: nome,
    cnpj: document.getElementById('of-cnpj').value.trim(),
    telefone: document.getElementById('of-telefone').value.trim(),
    email: document.getElementById('of-email').value.trim(),
    endereco: document.getElementById('of-endereco').value.trim(),
    categorias: categorias
  };

  if (currentOficinaId) {
    const idx = oficinas.findIndex(o => o.id === currentOficinaId);
    if (idx !== -1) oficinas[idx] = oficina;
  } else {
    oficinas.push(oficina);
  }

  saveOficinasToStorage();
  closeOficinaModal();
  renderOficinasList();
  updateOficinaKPIs();
  updateHotOficinaDropdown();
  Swal.fire('Salvo!', 'Oficina cadastrada com sucesso.', 'success');
}

function getCategoriaClass(cat) {
  const map = {
    'Mecânica': 'cat-mecanica',
    'Lanternagem': 'cat-lanternagem',
    'Lanternagem+Mecânica': 'cat-lantmec',
    'Vidros': 'cat-vidros',
    'Ar-Condicionado': 'cat-arcond',
    'Elétrica': 'cat-eletrica',
    'Alinhamento/Balanceamento': 'cat-alinhamento',
    'Estofaria': 'cat-estofaria',
    'Funilaria': 'cat-funilaria',
    'Pintura': 'cat-pintura'
  };
  return map[cat] || 'cat-mecanica';
}

function renderOficinasList() {
  const search = document.getElementById('search-oficina').value.toLowerCase();
  const catFilter = document.getElementById('filter-categoria').value;

  let filtered = oficinas;
  if (search) {
    filtered = filtered.filter(o => 
      o.nome.toLowerCase().includes(search) || 
      (o.cnpj && o.cnpj.toLowerCase().includes(search))
    );
  }
  if (catFilter) {
    filtered = filtered.filter(o => o.categorias.includes(catFilter));
  }

  const wrap = document.getElementById('oficinas-list');
  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">Nenhuma oficina encontrada</div>';
    return;
  }

  wrap.innerHTML = filtered.map(of => `
    <div class="card">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h3 class="font-extrabold text-lg text-gray-800">${of.nome}</h3>
          ${of.cnpj ? `<p class="text-xs text-gray-500">CNPJ: ${of.cnpj}</p>` : ''}
        </div>
        <div class="flex gap-2">
          <button onclick="editOficina(${of.id})" class="text-blue-600 hover:text-blue-800" title="Editar">✏️</button>
          <button onclick="deleteOficina(${of.id})" class="text-red-600 hover:text-red-800" title="Excluir">🗑️</button>
        </div>
      </div>
      <div class="space-y-2 text-sm text-gray-600 mb-3">
        ${of.telefone ? `<p>📞 ${of.telefone}</p>` : ''}
        ${of.email ? `<p>📧 ${of.email}</p>` : ''}
        ${of.endereco ? `<p>📍 ${of.endereco}</p>` : ''}
      </div>
      <div class="flex flex-wrap gap-1">
        ${of.categorias.map(cat => `<span class="category-badge ${getCategoriaClass(cat)}">${cat}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function updateOficinaKPIs() {
  const total = oficinas.length;
  const mec = oficinas.filter(o => o.categorias.includes('Mecânica')).length;
  const lant = oficinas.filter(o => o.categorias.includes('Lanternagem')).length;
  const lantmec = oficinas.filter(o => o.categorias.includes('Lanternagem+Mecânica')).length;
  const vidros = oficinas.filter(o => o.categorias.includes('Vidros')).length;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.innerText = val; };
  el('kpi-of-total', total);
  el('kpi-of-mec', mec);
  el('kpi-of-lant', lant);
  el('kpi-of-lantmec', lantmec);
  el('kpi-of-vidros', vidros);
}

function filterOficinasByCategory(cat) {
  document.getElementById('filter-categoria').value = cat;
  renderOficinasList();
}

// ============ MONTH NAVIGATION ============
function showMonthNavigator() {
  navigatorYear = currentYear;
  renderMonthCalendar();
  document.getElementById('monthNavigatorModal').classList.remove('hidden');
}

function closeMonthNavigator() {
  document.getElementById('monthNavigatorModal').classList.add('hidden');
}

function changeNavigatorYear(delta) {
  navigatorYear += delta;
  renderMonthCalendar();
}

function renderMonthCalendar() {
  document.getElementById('navigator-year').innerText = navigatorYear;
  
  const savedMonths = getSavedMonths();
  const savedKeys = new Set(savedMonths.map(m => monthKey(m.year, m.month)));
  
  const calendar = document.getElementById('month-calendar');
  calendar.innerHTML = MONTH_NAMES.map((name, idx) => {
    const month = idx + 1;
    const key = monthKey(navigatorYear, month);
    const hasData = savedKeys.has(key);
    const isCurrent = navigatorYear === currentYear && month === currentMonth;
    
    let classes = 'month-cell';
    if (isCurrent) classes += ' current';
    else if (hasData) classes += ' has-data';
    
    return `<div class="${classes}" onclick="loadMonthFromNavigator(${navigatorYear}, ${month})">${name}</div>`;
  }).join('');
}

function loadMonthFromNavigator(year, month) {
  const key = monthKey(year, month);
  const md = JSON.parse(localStorage.getItem(key) || 'null');
  
  if (md && md.data) {
    currentYear = year;
    currentMonth = month;
    hot.loadData(md.data);
    setBadge();
    updateDashboard();
    closeMonthNavigator();
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Carregado: ${monthLabel(year, month)}`,
      timer: 2000,
      showConfirmButton: false
    });
  } else {
    Swal.fire({
      title: 'Criar novo mês?',
      html: `Ainda não há dados para <b>${monthLabel(year, month)}</b>.<br><br>Deseja criar este mês vazio?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, criar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        currentYear = year;
        currentMonth = month;
        hot.loadData([[""]]);
        saveCurrentMonth();
        setBadge();
        updateDashboard();
        closeMonthNavigator();
        Swal.fire('Criado!', `Mês ${monthLabel(year, month)} criado com sucesso.`, 'success');
      }
    });
  }
}

async function createNewMonth() {
  const { value: formValues } = await Swal.fire({
    title: '📅 Criar Novo Mês',
    html: `
      <div class="text-left space-y-4">
        <div>
          <label class="block text-sm font-bold mb-1">Ano:</label>
          <input type="number" id="new-year" class="swal2-input" value="${navigatorYear}" min="2020" max="2030" style="width:100%;">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1">Mês:</label>
          <select id="new-month" class="swal2-input" style="width:100%; padding:10px;">
            ${MONTH_NAMES.map((name, idx) => `<option value="${idx + 1}">${name}</option>`).join('')}
          </select>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: '✅ Criar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      return [
        document.getElementById('new-year').value,
        document.getElementById('new-month').value
      ];
    }
  });

  if (formValues) {
    const [year, month] = formValues.map(Number);
    const key = monthKey(year, month);
    
    if (localStorage.getItem(key)) {
      Swal.fire('Já existe!', `O mês ${monthLabel(year, month)} já possui dados salvos.`, 'info');
      return;
    }
    
    currentYear = year;
    currentMonth = month;
    hot.loadData([[""]]);
    saveCurrentMonth();
    setBadge();
    updateDashboard();
    renderMonthCalendar();
    
    Swal.fire('Criado!', `Novo mês <b>${monthLabel(year, month)}</b> criado com sucesso!`, 'success');
  }
}

// ============ FIREBASE AUTO-CONNECT ============
function initFirebase() {
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyASDJpwHTtOn71liMYaMTwyWVDY4s1FJRU",
      authDomain: "porto-mais-eventos.firebaseapp.com",
      databaseURL: "https://porto-mais-eventos-default-rtdb.firebaseio.com",
      projectId: "porto-mais-eventos",
      storageBucket: "porto-mais-eventos.firebasestorage.app",
      messagingSenderId: "1084717178712",
      appId: "1:1084717178712:web:05f7aa39e06d626d208f2d"
    };
    
    const app = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
    
    document.getElementById('sync-status').innerHTML = '<span style="color:#10b981;">✓ Online</span>';
    console.log('✅ Firebase conectado automaticamente!');
    
    setInterval(() => {
      if (firebaseDb) {
        const md = saveCurrentMonth();
        firebaseDb.ref('months/' + monthKey(currentYear, currentMonth)).set(md)
          .then(() => console.log('🔄 Auto-sync realizado'))
          .catch(err => console.error('Erro no auto-sync:', err));
      }
    }, 30000);
    
    firebaseDb.ref('oficinas').once('value', snapshot => {
      const cloudOficinas = snapshot.val();
      if (cloudOficinas && Array.isArray(cloudOficinas) && cloudOficinas.length > 0) {
        oficinas = cloudOficinas;
        saveOficinasToStorage();
        updateHotOficinaDropdown();
        console.log('🏪 Oficinas baixadas do Firebase');
      }
    });
    
  } catch (error) {
    console.warn('Firebase não configurado:', error);
    document.getElementById('sync-status').innerHTML = '<span style="color:#64748b;">Offline</span>';
  }
}

// ============ DOWNLOAD/UPLOAD FIREBASE ============
async function downloadFromFirebase() {
  if (!firebaseDb) {
    Swal.fire('Firebase não disponível', 'Conexão com nuvem não configurada.', 'warning');
    return;
  }

  Swal.fire({
    title: '📥 Baixando da nuvem...',
    html: 'Aguarde enquanto buscamos seus dados do Firebase.',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try {
    const snapshot = await firebaseDb.ref('months').once('value');
    const cloudData = snapshot.val();

    if (!cloudData || Object.keys(cloudData).length === 0) {
      Swal.fire('⚠️ Nuvem vazia', 'Não há dados salvos na nuvem ainda. Use "Enviar para nuvem" primeiro.', 'info');
      return;
    }

    let downloadedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const [key, cloudMonth] of Object.entries(cloudData)) {
      const localData = localStorage.getItem(key);
      
      if (!localData) {
        localStorage.setItem(key, JSON.stringify(cloudMonth));
        downloadedCount++;
      } else {
        const localMonth = JSON.parse(localData);
        const cloudDate = new Date(cloudMonth.saveDate || 0);
        const localDate = new Date(localMonth.saveDate || 0);
        
        if (cloudDate > localDate) {
          localStorage.setItem(key, JSON.stringify(cloudMonth));
          updatedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    const months = getSavedMonths();
    if (months.length > 0) {
      const latest = months[0];
      currentYear = latest.year;
      currentMonth = latest.month;
      hot.loadData(latest.data || []);
      setBadge();
      updateDashboard();
    }

    const html = `
      <div class="text-left text-sm">
        <p class="mb-2"><b>✅ Sincronização concluída!</b></p>
        <ul class="space-y-1">
          <li>🆕 <b>${downloadedCount}</b> mês(es) baixado(s)</li>
          <li>🔄 <b>${updatedCount}</b> mês(es) atualizado(s)</li>
          <li>✅ <b>${skippedCount}</b> mês(es) já atualizado(s)</li>
        </ul>
      </div>
    `;

    Swal.fire({ icon: 'success', title: 'Dados sincronizados!', html: html, confirmButtonText: 'OK' });

  } catch (error) {
    console.error('Erro ao baixar da nuvem:', error);
    Swal.fire('Erro', 'Falha ao baixar dados: ' + error.message, 'error');
  }
}

async function uploadToFirebase() {
  if (!firebaseDb) {
    Swal.fire('Firebase não disponível', 'Conexão com nuvem não configurada.', 'warning');
    return;
  }
  
  const months = getSavedMonths();
  if (months.length === 0) {
    Swal.fire('⚠️ Nenhum dado local', 'Adicione alguns eventos antes de enviar para a nuvem.', 'info');
    return;
  }

  Swal.fire({
    title: '📤 Enviando para nuvem...',
    html: `Fazendo upload de ${months.length} mês(es)...<br><small>Aguarde, pode levar alguns segundos.</small>`,
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
  
  try {
    const results = await Promise.allSettled(
      months.map(m => 
        firebaseDb.ref('months/' + m.key).set({
          year: m.year,
          month: m.month,
          monthLabel: m.monthLabel,
          saveDate: new Date().toLocaleString('pt-BR'),
          data: m.data
        }).then(() => ({ success: true, key: m.key }))
          .catch(err => ({ success: false, key: m.key, error: err.message }))
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    if (failed > 0) {
      Swal.fire('⚠️ Upload parcial', `${successful} mês(es) enviado(s). ${failed} falharam. Tente novamente.`, 'warning');
    } else {
      Swal.fire('✅ Enviado!', `${successful} mês(es) salvos na nuvem com sucesso.`, 'success');
    }
  } catch (error) {
    console.error('Erro no upload:', error);
    Swal.fire('Erro', 'Falha ao enviar: ' + error.message, 'error');
  }
}

function syncToFirebase() {
  uploadToFirebase();
}

// ============ HELPERS ============
function parseDateDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.toString().trim();
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = parseInt(match[3]);
    if (month >= 0 && month <= 11) {
      return new Date(year, month, day);
    }
  }
  return null;
}

function go(page){
  const pages = ['data','dash','compare','juridico','oficinas'];
  pages.forEach(p=>{
    const el = document.getElementById('page-'+p);
    const nav = document.getElementById('nav-'+p);
    if(el) el.classList.toggle('active', p===page);
    if(nav) nav.classList.toggle('active', p===page);
  });
  const titleMap = { 
    data:'Editar dados', 
    dash:'Dashboard', 
    compare:'Comparação de Meses',
    juridico:'Jurídico (3º causador)', 
    oficinas:'Cadastro de Oficinas' 
  };
  const subMap = { 
    data:'Tabela principal do mês selecionado', 
    dash:'KPIs, gráficos e rankings do mês', 
    compare:'Compare métricas entre diferentes períodos',
    juridico:'Cobrança e status jurídico (3º causador)', 
    oficinas:'Gerencie oficinas parceiras e especialidades' 
  };
  document.getElementById('page-title').innerText = titleMap[page] || 'Gerenciador';
  document.getElementById('page-sub').innerText = subMap[page] || '';
  if(page==='dash') updateDashboard();
  if(page==='compare' && selectedMonthsForComparison.length >= 2) { renderComparisonCharts(); renderComparisonTable(); }
  if(page==='juridico') filterJuridicoView();
  if(page==='data') setTimeout(()=>hot.render(), 50);
  if(page==='oficinas') { renderOficinasList(); updateOficinaKPIs(); }
}

function showConfigMenu() {
  document.getElementById('configModal').classList.remove('hidden');
}

function closeConfigModal() {
  document.getElementById('configModal').classList.add('hidden');
}

function monthKey(y, m){ return `month_${y}_${String(m).padStart(2,'0')}`; }
function monthLabel(y,m){ return `${MONTH_NAMES[m-1]} ${y}`; }
function setBadge(){ const b = document.getElementById('badge-month'); if(b) b.innerText = monthLabel(currentYear, currentMonth); }

function getSavedMonths(){
  const months = [];
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('month_')){ 
      try{ 
        const monthData = JSON.parse(localStorage.getItem(k));
        if(monthData && monthData.year && monthData.month) {
          months.push({ key:k, ...monthData });
        }
      }catch(e){
        console.error('Erro ao ler mês:', k, e);
      } 
    }
  }
  return months.sort((a,b)=> (b.year-a.year) || (b.month-a.month));
}

function saveCurrentMonth(){
  const data = hot.getData();
  const k = monthKey(currentYear, currentMonth);
  const md = { year: currentYear, month: currentMonth, monthLabel: monthLabel(currentYear,currentMonth), saveDate: new Date().toLocaleString('pt-BR'), data };
  localStorage.setItem(k, JSON.stringify(md));
  return md;
}

function normalizePlaca(v){ return (v||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,'').trim(); }
function isOpenStatus(status){ const s = (status||'').toString().toUpperCase().trim(); return !(s==='FINALIZADO' || s==='NEGADO'); }

function isVidroRow(r){ return (r[2]||'').toString().toUpperCase().trim()==='VIDROS'; }
function isRouboRow(r){ return (r[2]||'').toString().toUpperCase().trim()==='ROUBO/FURTO'; }
function isAcordoRow(r){ return (r[12]||'').toString().toUpperCase().trim()==='ACORDO'; }
function isFinalizadoRow(r){ return (r[12]||'').toString().toUpperCase().trim()==='FINALIZADO'; }

function isTerceiroCausadorRow(r){ return (r[13]||'').toString().toUpperCase().trim()==='TERCEIRO'; }
function isJuridicoStatus(r, statuses){ return statuses.includes((r[14]||'').toString().toUpperCase().trim()); }

function applyFilter(predicate){
  const data = hot.getData() || [];
  const matches = [];
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(!r[0]) continue;
    if(predicate(r, i)) matches.push(i);
  }
  if(!matches.length){ Swal.fire('Sem resultados','Nenhuma linha encontrada para esse filtro.','info'); return; }
  go('data');
  setTimeout(()=>{
    const filters = hot.getPlugin('filters');
    try{ filters.clearConditions(); filters.filter(); }catch(e){}
    hot.render();
    hot.selectCell(matches[0], 0);
    hot.scrollViewportTo(matches[0], 0);
    Swal.fire({ toast:true, position:'top-end', timer:1800, showConfirmButton:false, icon:'success', title:`Filtro aplicado: ${matches.length} linha(s)` });
  }, 120);
}

function kpiFilter(key){
  if(key==='all') return applyFilter(()=>true);
  if(key==='vidros') return applyFilter(r=>isVidroRow(r));
  if(key==='roubo') return applyFilter(r=>isRouboRow(r));
  if(key==='acordos') return applyFilter(r=>isAcordoRow(r));
  if(key==='finalizados') return applyFilter(r=>isFinalizadoRow(r));
  if(key==='open') return applyFilter(r=>isOpenStatus(r[12]));
  if(key==='terceiroCausador') return applyFilter(r=>isTerceiroCausadorRow(r));
  if(key==='jurEm') return applyFilter(r=>isTerceiroCausadorRow(r) && isJuridicoStatus(r,['EM COBRANÇA','COBRADO']));
  if(key==='jurRec') return applyFilter(r=>isTerceiroCausadorRow(r) && isJuridicoStatus(r,['RECUPERADO']));
  if(key==='jurNao') return applyFilter(r=>isTerceiroCausadorRow(r) && isJuridicoStatus(r,['NÃO COBRAR']));
  if(key==='jurValor') return applyFilter(r=>isTerceiroCausadorRow(r) && ((parseFloat(r[16])||0)>0));
}

function buildOpenPanel(openRows){
  const wrap = document.getElementById('open-panel');
  if(!wrap) return;
  if(!openRows.length){ wrap.innerHTML = '<div class="text-gray-400">Sem eventos em aberto neste mês.</div>'; return; }
  wrap.innerHTML = `
    <div class="space-y-2">
      ${openRows.slice(0,12).map(item=>{
        const v = item.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
        return `
          <div class="open-panel-item border rounded-lg p-3 bg-white shadow-sm" onclick="openRow(${item.rowIndex})">
            <div class="flex items-center justify-between">
              <div class="font-extrabold text-gray-800">${item.placa || '-'} <span class="text-xs text-gray-400 font-normal">(${item.status || '-'})</span></div>
              <div class="text-sm font-bold text-blue-600">${v}</div>
            </div>
            <div class="text-xs text-gray-500 mt-1">${item.eventoTipo || ''} • ${item.veiculo || ''} • ${item.oficina || ''}</div>
          </div>`;
      }).join('')}
      ${openRows.length>12 ? `<div class="text-xs text-gray-400 text-center mt-3">Mostrando 12 de ${openRows.length}. Use "Ver na planilha" para ver todos.</div>` : ''}
    </div>`;
}

function buildTopOficinas(data) {
  const wrap = document.getElementById('top-oficinas');
  if (!wrap) return;
  
  const oficinas = {};
  data.forEach(r => {
    if (!r[0]) return;
    const oficina = (r[6] || 'SEM OFICINA').toString().trim().toUpperCase();
    if (!oficinas[oficina]) oficinas[oficina] = { count: 0, valor: 0 };
    oficinas[oficina].count++;
    oficinas[oficina].valor += parseFloat(r[11]) || 0;
  });
  
  const sorted = Object.entries(oficinas)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  
  if (sorted.length === 0) {
    wrap.innerHTML = '<div class="text-gray-400 text-center py-4">Sem dados de oficinas</div>';
    return;
  }
  
  wrap.innerHTML = sorted.map(([nome, info], idx) => {
    const posClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
    return `
      <div class="ranking-item">
        <div class="ranking-pos ${posClass}">${idx + 1}</div>
        <div class="ranking-info">
          <div class="ranking-name">${nome}</div>
          <div class="ranking-details">${info.valor.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</div>
        </div>
        <div class="ranking-value">${info.count} carros</div>
      </div>
    `;
  }).join('');
}

function buildTopCarros(data) {
  const wrap = document.getElementById('top-carros');
  if (!wrap) return;
  
  const carros = data
    .filter(r => r[0] && r[4])
    .map((r, idx) => ({
      placa: normalizePlaca(r[4]),
      veiculo: r[3] || 'N/D',
      valor: parseFloat(r[11]) || 0,
      rowIndex: idx
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
  
  if (carros.length === 0) {
    wrap.innerHTML = '<div class="text-gray-400 text-center py-4">Sem dados de veículos</div>';
    return;
  }
  
  wrap.innerHTML = carros.map((car, idx) => {
    const posClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
    return `
      <div class="ranking-item" onclick="openRow(${car.rowIndex})">
        <div class="ranking-pos ${posClass}">${idx + 1}</div>
        <div class="ranking-info">
          <div class="ranking-name">${car.placa}</div>
          <div class="ranking-details">${car.veiculo}</div>
        </div>
        <div class="ranking-value">${car.valor.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</div>
      </div>
    `;
  }).join('');
}

function buildRankingJuridico(data) {
  const wrap = document.getElementById('ranking-juridico');
  if (!wrap) return;
  
  const juridico = data
    .map((r, idx) => ({ r, idx }))
    .filter(x => isTerceiroCausadorRow(x.r) && (parseFloat(x.r[16]) || 0) > 0)
    .map(x => ({
      placa: normalizePlaca(x.r[4]),
      veiculo: x.r[3] || 'N/D',
      beneficiario: x.r[1] || 'N/D',
      eventoTipo: x.r[2] || 'N/D',
      status: x.r[14] || 'N/D',
      valorRecuperar: parseFloat(x.r[16]) || 0,
      rowIndex: x.idx
    }))
    .sort((a, b) => b.valorRecuperar - a.valorRecuperar)
    .slice(0, 10);
  
  if (juridico.length === 0) {
    wrap.innerHTML = '<div class="text-gray-400 text-center py-4">Sem valores a recuperar no momento</div>';
    return;
  }
  
  wrap.innerHTML = juridico.map((item, idx) => {
    const posClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
    return `
      <div class="ranking-item" onclick="openRow(${item.rowIndex})">
        <div class="ranking-pos ${posClass}">${idx + 1}</div>
        <div class="ranking-info">
          <div class="ranking-name">${item.placa} - ${item.beneficiario}</div>
          <div class="ranking-details">${item.eventoTipo} • Status: ${item.status} • ${item.veiculo}</div>
        </div>
        <div class="ranking-value">${item.valorRecuperar.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</div>
      </div>
    `;
  }).join('');
}

function openRow(rowIndex){ go('data'); setTimeout(()=>{ hot.selectCell(rowIndex, 0); hot.scrollViewportTo(rowIndex, 0); }, 120); }

function findOpenPlateInOtherMonths(placa){
  const p = normalizePlaca(placa);
  if(!p) return null;
  const months = getSavedMonths();
  for(const m of months){
    if(m.year===currentYear && m.month===currentMonth) continue;
    const rows = m.data || [];
    for(const r of rows){
      const placaR = normalizePlaca(r[4]);
      const st = r[12];
      if(placaR===p && isOpenStatus(st)) return { monthLabel: m.monthLabel || monthLabel(m.year,m.month), key: m.key, status: st };
    }
  }
  return null;
}

async function saveCurrentMonthWithChecks(){
  const rows = hot.getData();
  const duplicates = [];
  for(const r of rows){ if(!r[0]) continue; const found = findOpenPlateInOtherMonths(r[4]); if(found) duplicates.push({ placa: normalizePlaca(r[4]), found }); }
  if(duplicates.length){
    const first = duplicates[0];
    const html = `<div class="text-left text-sm">
      <p><b>Encontramos placa(s) já em aberto em outro mês.</b></p>
      <p class="mt-2">Exemplo: <b>${first.placa}</b> está em <b>${first.found.monthLabel}</b> (status: ${first.found.status||'-'}).</p>
      <p class="mt-2 text-xs text-gray-500">O sistema não vai duplicar para outro mês. Vá no mês onde está aberto e finalize/negue antes.</p>
    </div>`;
    const res = await Swal.fire({ title: '⚠️ Placa já em aberto', html, icon: 'warning', showCancelButton: true, confirmButtonText: 'Ir para o mês', cancelButtonText: 'Cancelar' });
    if(res.isConfirmed){
      const md = JSON.parse(localStorage.getItem(first.found.key));
      if(md){ currentYear = md.year; currentMonth = md.month; hot.loadData(md.data); setBadge(); go('data'); }
    }
    return;
  }
  saveCurrentMonth(); setBadge(); 
  
  if (firebaseDb) {
    const md = saveCurrentMonth();
    firebaseDb.ref('months/' + monthKey(currentYear, currentMonth)).set(md)
      .then(() => Swal.fire('✅ Salvo!', 'Mês salvo e sincronizado com a nuvem.', 'success'))
      .catch(() => Swal.fire('✅ Salvo!', 'Mês salvo localmente.', 'success'));
  } else {
    Swal.fire('✅ Salvo!', 'Mês salvo com sucesso.', 'success');
  }
}

function exportAllBackup(){
  const months = getSavedMonths();
  if(!months.length){ Swal.fire('❌ Nenhum Backup','Nenhum mês salvo ainda.','error'); return; }
  const backup = { exportDate: new Date().toLocaleString('pt-BR'), totalMonths: months.length, months: months.map(m=>({monthLabel:m.monthLabel, year:m.year, month:m.month, saveDate:m.saveDate, data:m.data})) };
  const blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_portoMais_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackupFile(){
  const i = document.createElement('input');
  i.type='file'; i.accept='.json';
  i.onchange=(e)=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=(ev)=>{
      try{
        const d=JSON.parse(ev.target.result);
        if(!d.months) throw new Error('Inválido');
        d.months.forEach(m=> localStorage.setItem(monthKey(m.year, m.month), JSON.stringify(m)));
        const first=d.months[0];
        currentYear=first.year; currentMonth=first.month;
        hot.loadData(first.data);
        setBadge(); updateDashboard();
        Swal.fire('✅ Carregado!','Backup restaurado.','success');
      }catch(err){ Swal.fire('Erro','Falha ao importar: '+err.message,'error'); }
    };
    r.readAsText(f);
  };
  i.click();
}

function openImportModal(){ document.getElementById('importModal').classList.remove('hidden'); }
function closeImportModal(){ document.getElementById('importModal').classList.add('hidden'); }

function inferEventoTipoFromRow12(base12){
  const veic = (base12[2]||'').toString().toUpperCase();
  const ofi = (base12[5]||'').toString().toUpperCase();
  const sit = (base12[11]||'').toString().toUpperCase();
  if(veic.includes('ROUBO') || veic.includes('FURTO') || ofi.includes('INDENIZA') || sit.includes('INDENIZA')) return 'ROUBO/FURTO';
  if(veic.includes('VIDRO') || ofi.includes('VIDRO') || ofi.includes('CARGLASS') || ofi.includes('AUTO GLASS') || sit.includes('VIDRO')) return 'VIDROS';
  return 'OUTROS';
}

function processPaste(){
  const raw = (document.getElementById('pasteArea').value||'').trim();
  if(!raw){ Swal.fire('⚠️ Atenção','Cole os dados primeiro.','warning'); return; }

  const rows = raw.split('\n').map(line=>{
    let parts = line.split('\t');
    if(parts.length===1) parts=line.split(',');
    if(parts.length===1) parts=line.split(/\s{2,}/);
    return parts.map(p=>p.trim());
  });

  const normalized = rows.map(r=>{
    const base = r.slice(0,12);
    while(base.length<12) base.push('');
    const eventoTipo = inferEventoTipoFromRow12(base);
    const row18 = [base[0], base[1], eventoTipo, base[2], base[3], base[4], base[5], base[6], base[7], base[8], base[9], base[10], base[11], 'NÃO IDENTIFICADO','NÃO INICIADO','','',''];
    return row18;
  });

  const kept=[];
  const blocked=[];
  for(const r of normalized){
    const found = findOpenPlateInOtherMonths(r[4]);
    if(found) blocked.push({placa: normalizePlaca(r[4]), month: found.monthLabel});
    else kept.push(r);
  }

  hot.populateFromArray(0,0, kept);
  closeImportModal();
  document.getElementById('pasteArea').value='';
  saveCurrentMonth(); setBadge();

  if(blocked.length) Swal.fire('⚠️ Alguns registros foram bloqueados', `${blocked.length} placa(s) já estavam em aberto em outro mês e não foram importadas.`, 'warning');
  else Swal.fire('✅ Sucesso!', `${kept.length} linhas importadas com sucesso!`, 'success');
}

function exportData(){ const exportPlugin = hot.getPlugin('exportFile'); exportPlugin.downloadFile('csv', { filename:'Eventos_PortoMais', columnHeaders:true, bom:true }); }

function updateDashboard(){
  let data=[]; try{ data = hot.getData(); }catch(e){}

  let tEv=0, cVid=0, cRou=0, cCol=0, cOut=0, cAcor=0, cFin=0;
  let $Vid=0, $Rou=0, $Col=0, $Out=0;
  let jurEm=0, jurRec=0, jurNao=0, jurValor=0, tercCaus=0;
  let jurStatusCounts = {};
  let openRows=[];

  if(data && data.length){
    data.forEach((r, idx)=>{
      if(!r[0]) return;
      tEv++;

      const val = (parseFloat(r[8])||0) + (parseFloat(r[9])||0) + (parseFloat(r[10])||0);
      const tipo = (r[2]||'').toString().toUpperCase().trim();

      if(tipo==='ROUBO/FURTO'){ cRou++; $Rou+=val; }
      else if(tipo==='VIDROS'){ cVid++; $Vid+=val; }
      else if(tipo==='COLISÃO'){ cCol++; $Col+=val; }
      else { cOut++; $Out+=val; }

      if(isAcordoRow(r)) cAcor++;
      if(isFinalizadoRow(r)) cFin++;

      if(isOpenStatus(r[12])){
        openRows.push({ rowIndex: idx, placa: normalizePlaca(r[4]), veiculo: r[3]||'', oficina: r[6]||'', status: r[12]||'', valor: (parseFloat(r[11])||0), eventoTipo: r[2]||'' });
      }

      if(isTerceiroCausadorRow(r)){
        const jur = (r[14]||'').toString().toUpperCase().trim();
        const valRec = parseFloat(r[16]) || 0;
        tercCaus++;
        if(jur) jurStatusCounts[jur] = (jurStatusCounts[jur]||0)+1;
        if(jur==='EM COBRANÇA' || jur==='COBRADO') jurEm++;
        if(jur==='RECUPERADO') jurRec++;
        if(jur==='NÃO COBRAR') jurNao++;
        jurValor += valRec;
      }
    });
  }

  const el=(i,v)=>{ const e=document.getElementById(i); if(e) e.innerText=v; };
  const m=(v)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  el('kpi-total', tEv);
  el('kpi-roubo', cRou);
  el('kpi-vidros', cVid);
  el('kpi-acordos', cAcor);
  el('kpi-finalizados', cFin);
  el('kpi-terc-causador', tercCaus);
  el('kpi-jur-em', jurEm);
  el('kpi-jur-rec', jurRec);
  el('kpi-jur-nao', jurNao);
  el('kpi-jur-valor', m(jurValor));

  buildOpenPanel(openRows.sort((a,b)=> (b.valor-a.valor)));
  buildTopOficinas(data);
  buildTopCarros(data);
  buildRankingJuridico(data);

  if(chartTipo) chartTipo.destroy();
  chartTipo = new Chart(document.getElementById('chart-tipo'), {
    type:'doughnut',
    data:{
      labels:['Vidros','Roubo/Furto','Colisão','Outros'],
      datasets:[{
        data:[cVid, cRou, cCol, cOut],
        backgroundColor:['#06b6d4','#a855f7','#f59e0b','#64748b'],
        borderWidth:0
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{position:'bottom', labels:{font:{size:11,weight:'bold'}, padding:12}},
        tooltip:{backgroundColor:'rgba(0,0,0,0.8)', padding:12, bodyFont:{size:13}}
      },
      animation:{animateRotate:true, animateScale:true, duration:800}
    }
  });

  if(chartJuridico) chartJuridico.destroy();
  const jLabs = Object.keys(jurStatusCounts);
  const jVals = Object.values(jurStatusCounts);
  chartJuridico = new Chart(document.getElementById('chart-juridico'), {
    type:'pie',
    data:{
      labels: jLabs.length? jLabs : ['Sem dados'],
      datasets:[{
        data: jLabs.length? jVals : [1],
        backgroundColor:['#6366f1','#10b981','#f43f5e','#eab308','#64748b','#06b6d4'],
        borderWidth:0
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{position:'bottom', labels:{font:{size:11,weight:'bold'}, padding:12}},
        tooltip:{backgroundColor:'rgba(0,0,0,0.8)', padding:12, bodyFont:{size:13}}
      },
      animation:{animateRotate:true, animateScale:true, duration:800}
    }
  });

  if(chartCustos) chartCustos.destroy();
  chartCustos = new Chart(document.getElementById('chart-custos'), {
    type:'bar',
    data:{
      labels:['Vidros','Roubo/Furto','Colisão','Outros'],
      datasets:[{
        label:'Custo Total (R$)',
        data:[$Vid, $Rou, $Col, $Out],
        backgroundColor:['#06b6d4','#a855f7','#f59e0b','#64748b'],
        borderRadius:8
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'rgba(0,0,0,0.8)', padding:12, bodyFont:{size:13}, callbacks:{label:ctx=> 'R$ '+ctx.parsed.y.toLocaleString('pt-BR',{minimumFractionDigits:2})}}
      },
      scales:{
        y:{beginAtZero:true, ticks:{callback:v=>'R$ '+v.toLocaleString('pt-BR'), font:{size:10}}}
      },
      animation:{duration:800, easing:'easeInOutQuart'}
    }
  });
}

function filterJuridicoView(){
  const data = hot.getData() || [];
  const rows = data.map((r, idx)=>({r, idx})).filter(x=> isTerceiroCausadorRow(x.r));
  const wrap = document.getElementById('juridico-table');
  if(!wrap) return;
  if(!rows.length){ wrap.innerHTML = '<div class="text-gray-400">Sem eventos com CAUSADOR = TERCEIRO neste mês.</div>'; return; }
  const head = ['PLACA','EVENTO TIPO','BENEFICIÁRIO','VEÍCULO','SITUAÇÃO','STATUS JURÍDICO','VALOR RECUP.','OBS'];
  wrap.innerHTML = `
    <div class="overflow-auto">
      <table class="min-w-full text-xs">
        <thead><tr>${head.map(h=>`<th class="text-left p-2 bg-gray-100 border">${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map(x=>{
            const r = x.r;
            const placa = normalizePlaca(r[4]);
            const valRec = parseFloat(r[16])||0;
            return `<tr class="border-b hover:bg-gray-50 open-panel-item" onclick="openRow(${x.idx})">
              <td class="p-2 font-extrabold">${placa||''}</td>
              <td class="p-2 font-bold">${(r[2]||'')}</td>
              <td class="p-2">${(r[1]||'')}</td>
              <td class="p-2">${(r[3]||'')}</td>
              <td class="p-2">${(r[12]||'')}</td>
              <td class="p-2 font-bold">${(r[14]||'')}</td>
              <td class="p-2">${valRec? valRec.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : ''}</td>
              <td class="p-2">${(r[17]||'')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function initHandsontable() {
  const initialData = [[""]];
  const container = document.getElementById('spreadsheet');
  
  hot = new Handsontable(container, {
    data: initialData,
    colHeaders: [
      'ASSOCIAÇÃO','BENEFICIÁRIO','EVENTO TIPO','VEÍCULO','PLACA','DATA OFICINA','OFICINA',
      'COTA','MÃO DE OBRA','PEÇAS','OUTRAS DESPESAS','GASTOS TOTAIS','SITUAÇÃO',
      'CAUSADOR','JURÍDICO STATUS','DT ENVIO JURÍDICO','VALOR A RECUPERAR','OBS JURÍDICO'
    ],
    columns: [
      { type:'text' },
      { type:'dropdown', source:['ASSOCIADO','TERCEIRO'] },
      { type:'dropdown', source: EVENTO_TIPO_OPTS },
      { type:'text' },
      { type:'text' },
      { type:'date', dateFormat:'DD/MM/YYYY', correctFormat:true },
      { type:'dropdown', source: [] },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' }, readOnly:true },
      { type:'dropdown', source:['FINALIZADO','EM ANDAMENTO','NEGADO','PENDENTE','ACORDO'] },
      { type:'dropdown', source: CAUSADOR_OPTS },
      { type:'dropdown', source: JURIDICO_STATUS },
      { type:'date', dateFormat:'DD/MM/YYYY', correctFormat:true },
      { type:'numeric', numericFormat:{ pattern:'0,0.00', culture:'pt-BR' } },
      { type:'text' }
    ],
    rowHeaders: true,
    width:'100%',
    height:'65vh',
    licenseKey:'non-commercial-and-evaluation',
    minSpareRows: 1,
    filters:true,
    dropdownMenu:true,
    manualColumnResize:true,
    autoWrapRow:true,
    stretchH:'all',
    afterChange(changes, source){
      if(!changes || source==='source') return;
      changes.forEach(([row, col])=>{
        if([7,8,9,10].includes(col)){
          const cota=parseFloat(this.getDataAtCell(row,7))||0;
          const mao=parseFloat(this.getDataAtCell(row,8))||0;
          const pecas=parseFloat(this.getDataAtCell(row,9))||0;
          const outras=parseFloat(this.getDataAtCell(row,10))||0;
          this.setDataAtCell(row,11, cota+mao+pecas+outras, 'source');
        }
      });
      saveCurrentMonth(); setBadge();
    }
  });
}

setTimeout(()=>{ 
  loadOficinas();
  initFirebase();
  initHandsontable();
  setBadge(); 
  saveCurrentMonth(); 
  updateHotOficinaDropdown();
  updateDashboard(); 
}, 200);