// ============================================================================
// MELHORIAS IMPLEMENTADAS - EventosPortoMais v2.2
// Data: 10/02/2026
// ============================================================================
// Este arquivo contém as novas funções para:
// 1. Finalização cross-month (eventos finalizados em mês diferente)
// 2. Eventos em atraso (40+ dias na oficina)
// 3. Filtros corretos no dashboard
// 4. VALIDAÇÃO PLACAS DUPLICADAS COM AVISO (sem bloquear)
// 5. ABAS DE NAVEGAÇÃO RÁPIDA DE MESES
// ============================================================================

// ============ 1. FUNÇÕES DE EVENTOS ATRASADOS ============

/**
 * Calcula quantos dias se passaram desde a DATA OFICINA
 * @param {string} dataOficina - Data no formato DD/MM/YYYY
 * @returns {number} - Número de dias de atraso (0 se inválido ou futuro)
 */
function calcularDiasAtraso(dataOficina) {
  if (!dataOficina) return 0;
  
  const data = parseDateDDMMYYYY(dataOficina);
  if (!data) return 0;
  
  const hoje = new Date();
  const diff = hoje - data;
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  return dias > 0 ? dias : 0;
}

/**
 * Verifica se um evento está atrasado (40+ dias e status em aberto)
 * @param {Array} row - Linha da planilha
 * @returns {boolean}
 */
function isEventoAtrasado(row) {
  const dias = calcularDiasAtraso(row[5]); // DATA OFICINA na coluna 5
  const status = (row[12] || '').toString().toUpperCase().trim();
  return dias > 40 && isOpenStatus(status);
}

/**
 * Retorna a classe CSS baseada nos dias de atraso
 * @param {number} dias - Dias de atraso
 * @returns {string} - Classe CSS
 */
function getAtrasoColor(dias) {
  if (dias >= 90) return 'bg-red-100 border-red-500 border-l-4';
  if (dias >= 60) return 'bg-orange-100 border-orange-500 border-l-4';
  return 'bg-yellow-100 border-yellow-500 border-l-4';
}

/**
 * Retorna emoji baseado nos dias de atraso
 * @param {number} dias - Dias de atraso
 * @returns {string} - Emoji
 */
function getAtrasoEmoji(dias) {
  if (dias >= 90) return '🔴';
  if (dias >= 60) return '🟠';
  return '🟡';
}

/**
 * Constrói o painel de eventos atrasados
 * @param {Array} data - Dados da planilha
 */
function buildAtrasadosPanel(data) {
  const wrap = document.getElementById('atrasados-panel');
  if (!wrap) return;
  
  if (!data || !data.length) {
    wrap.innerHTML = '<div class="text-gray-400 text-center py-4">Sem eventos em atraso neste mês</div>';
    return;
  }
  
  // Mapeia eventos atrasados
  const atrasados = data
    .map((r, idx) => ({
      rowIndex: idx,
      placa: normalizePlaca(r[4]),
      veiculo: r[3] || 'N/D',
      oficina: r[6] || 'N/D',
      dataOficina: r[5] || '',
      status: r[12] || '',
      dias: calcularDiasAtraso(r[5])
    }))
    .filter(x => x.dias > 40 && isOpenStatus(x.status))
    .sort((a, b) => b.dias - a.dias); // Ordena do mais atrasado para o menos
  
  if (atrasados.length === 0) {
    wrap.innerHTML = '<div class="text-gray-400 text-center py-4">✅ Nenhum evento atrasado! Todos dentro do prazo.</div>';
    return;
  }
  
  // Renderiza lista
  wrap.innerHTML = `
    <div class="space-y-2">
      ${atrasados.slice(0, 15).map(item => {
        const colorClass = getAtrasoColor(item.dias);
        const emoji = getAtrasoEmoji(item.dias);
        const urgencia = item.dias >= 90 ? 'CRÍTICO' : item.dias >= 60 ? 'URGENTE' : 'ATENÇÃO';
        
        return `
          <div class="open-panel-item border rounded-lg p-3 shadow-sm ${colorClass}" onclick="openRow(${item.rowIndex})">
            <div class="flex items-center justify-between mb-2">
              <div class="font-extrabold text-gray-800 flex items-center gap-2">
                ${emoji} ${item.placa}
                <span class="text-xs px-2 py-1 rounded-full bg-gray-800 text-white font-bold">${urgencia}</span>
              </div>
              <div class="text-sm font-bold text-red-600">${item.dias} dias</div>
            </div>
            <div class="text-xs text-gray-600">
              <p><b>Veículo:</b> ${item.veiculo}</p>
              <p><b>Oficina:</b> ${item.oficina}</p>
              <p><b>Data Oficina:</b> ${item.dataOficina}</p>
              <p><b>Status:</b> ${item.status}</p>
            </div>
          </div>
        `;
      }).join('')}
      ${atrasados.length > 15 ? `
        <div class="text-xs text-gray-400 text-center mt-3 p-2 bg-gray-50 rounded">
          Mostrando 15 de ${atrasados.length} eventos atrasados. Clique no card "Eventos em Atraso" para ver todos na planilha.
        </div>
      ` : ''}
    </div>
  `;
}

// ============ 2. FUNÇÕES DE FILTROS CORRETOS ============

/**
 * Aplica filtro avançado usando plugin filters do Handsontable
 * @param {number} columnIndex - Índice da coluna
 * @param {Array|string} values - Valores para filtrar
 */
function applyAdvancedFilter(columnIndex, values) {
  if (!hot) return;
  
  try {
    const filters = hot.getPlugin('filters');
    
    // Limpa filtros anteriores
    filters.clearConditions();
    
    // Adiciona nova condição
    if (Array.isArray(values)) {
      filters.addCondition(columnIndex, 'by_value', [values]);
    } else {
      filters.addCondition(columnIndex, 'by_value', [[values]]);
    }
    
    // Aplica filtro
    filters.filter();
    hot.render();
    
    // Mostra badge de filtro ativo
    showFilterBadge(values, columnIndex);
    
  } catch (error) {
    console.error('Erro ao aplicar filtro:', error);
  }
}

/**
 * Limpa todos os filtros ativos
 */
function clearFilters() {
  if (!hot) return;
  
  try {
    const filters = hot.getPlugin('filters');
    filters.clearConditions();
    filters.filter();
    hot.render();
    
    // Remove badge de filtro
    hideFilterBadge();
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: '❌ Filtros removidos',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Erro ao limpar filtros:', error);
  }
}

/**
 * Mostra badge indicando filtro ativo
 * @param {string|Array} filterValue - Valor do filtro
 * @param {number} columnIndex - Índice da coluna filtrada
 */
function showFilterBadge(filterValue, columnIndex) {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  
  // Remove badge anterior se existir
  const oldBadge = document.getElementById('active-filter-badge');
  if (oldBadge) oldBadge.remove();
  
  // Conta linhas visíveis
  const data = hot.getData();
  const filters = hot.getPlugin('filters');
  const visibleRows = data.filter((r, idx) => !filters.isRowHidden(idx)).length;
  
  // Cria novo badge
  const badge = document.createElement('div');
  badge.id = 'active-filter-badge';
  badge.className = 'inline-flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-bold';
  badge.innerHTML = `
    🔍 Filtro Ativo: ${Array.isArray(filterValue) ? filterValue.join(', ') : filterValue} (${visibleRows} resultados)
    <button onclick="clearFilters()" class="hover:bg-blue-600 rounded-full px-2">×</button>
  `;
  
  topbar.appendChild(badge);
}

/**
 * Remove badge de filtro ativo
 */
function hideFilterBadge() {
  const badge = document.getElementById('active-filter-badge');
  if (badge) badge.remove();
}

/**
 * Função kpiFilter modificada para usar filtros corretos
 * @param {string} key - Tipo de filtro
 */
function kpiFilterNew(key) {
  if (!hot) return;
  
  // Vai para página de dados
  go('data');
  
  setTimeout(() => {
    const data = hot.getData();
    
    switch(key) {
      case 'all':
        clearFilters();
        break;
        
      case 'vidros':
        applyAdvancedFilter(2, 'VIDROS'); // EVENTO TIPO
        break;
        
      case 'roubo':
        applyAdvancedFilter(2, 'ROUBO/FURTO'); // EVENTO TIPO
        break;
        
      case 'acordos':
        applyAdvancedFilter(12, 'ACORDO'); // SITUAÇÃO
        break;
        
      case 'finalizados':
        applyAdvancedFilter(12, 'FINALIZADO'); // SITUAÇÃO
        break;
        
      case 'open':
        // Filtrar status em aberto (não FINALIZADO e não NEGADO)
        applyAdvancedFilter(12, ['EM ANDAMENTO', 'PENDENTE', 'ACORDO']);
        break;
        
      case 'terceiroCausador':
        applyAdvancedFilter(13, 'TERCEIRO'); // CAUSADOR
        break;
        
      case 'jurEm':
        // Primeiro filtra terceiro, depois status jurídico
        const filters = hot.getPlugin('filters');
        filters.clearConditions();
        filters.addCondition(13, 'by_value', [['TERCEIRO']]);
        filters.addCondition(14, 'by_value', [['EM COBRANÇA', 'COBRADO']]);
        filters.filter();
        hot.render();
        showFilterBadge('Jurídico em cobrança', 14);
        break;
        
      case 'jurRec':
        const filters2 = hot.getPlugin('filters');
        filters2.clearConditions();
        filters2.addCondition(13, 'by_value', [['TERCEIRO']]);
        filters2.addCondition(14, 'by_value', [['RECUPERADO']]);
        filters2.filter();
        hot.render();
        showFilterBadge('Jurídico recuperado', 14);
        break;
        
      case 'jurNao':
        const filters3 = hot.getPlugin('filters');
        filters3.clearConditions();
        filters3.addCondition(13, 'by_value', [['TERCEIRO']]);
        filters3.addCondition(14, 'by_value', [['NÃO COBRAR']]);
        filters3.filter();
        hot.render();
        showFilterBadge('Jurídico não cobrar', 14);
        break;
        
      case 'jurValor':
        // Filtrar terceiro causador com valor > 0
        const filters4 = hot.getPlugin('filters');
        filters4.clearConditions();
        filters4.addCondition(13, 'by_value', [['TERCEIRO']]);
        filters4.addCondition(16, 'gt', [0]); // VALOR A RECUPERAR > 0
        filters4.filter();
        hot.render();
        showFilterBadge('Com valor a recuperar', 16);
        break;
        
      case 'atrasados':
        // Filtrar eventos atrasados (40+ dias)
        clearFilters();
        const atrasadosIndexes = [];
        data.forEach((r, idx) => {
          if (isEventoAtrasado(r)) {
            atrasadosIndexes.push(idx);
          }
        });
        
        if (atrasadosIndexes.length === 0) {
          Swal.fire('Sem atrasados', 'Nenhum evento com 40+ dias encontrado!', 'info');
        } else {
          // Scroll para primeiro atrasado
          hot.selectCell(atrasadosIndexes[0], 0);
          hot.scrollViewportTo(atrasadosIndexes[0], 0);
          showFilterBadge(`Atrasados (40+ dias)`, 5);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `${atrasadosIndexes.length} evento(s) atrasado(s)`,
            timer: 2000,
            showConfirmButton: false
          });
        }
        break;
        
      default:
        clearFilters();
    }
  }, 150);
}

// ============ 3. VALIDAÇÃO DE PLACAS DUPLICADAS (CROSS-MONTH PERMITIDO) ============

/**
 * Verifica se placa já existe no mês atual com mesmo status
 * @param {string} placa - Placa a verificar
 * @param {number} rowIndex - Índice da linha atual (para ignorar)
 * @returns {Object|null} - {row, status} se encontrou duplicata, null caso contrário
 */
function verificarPlacaDuplicadaMesAtual(placa, rowIndex) {
  if (!hot) return null;
  
  const placaNorm = normalizePlaca(placa);
  if (!placaNorm) return null;
  
  const data = hot.getData();
  
  for (let i = 0; i < data.length; i++) {
    if (i === rowIndex) continue; // Ignora linha atual
    
    const r = data[i];
    if (!r[0]) continue; // Linha vazia
    
    const placaR = normalizePlaca(r[4]);
    const statusR = (r[12] || '').toString().toUpperCase().trim();
    
    // Se encontrou mesma placa com status em aberto
    if (placaR === placaNorm && isOpenStatus(statusR)) {
      return { row: i, status: statusR };
    }
  }
  
  return null;
}

/**
 * Busca placa em outros meses (cross-month)
 * @param {string} placa - Placa a buscar
 * @returns {Object|null} - {monthLabel, status, key} se encontrou, null caso contrário
 */
function findOpenPlateInOtherMonths(placa) {
  const placaNorm = normalizePlaca(placa);
  if (!placaNorm) return null;
  
  const months = getSavedMonths();
  
  for (const m of months) {
    // Ignora mês atual
    if (m.year === currentYear && m.month === currentMonth) continue;
    
    const rows = m.data || [];
    for (const r of rows) {
      if (!r[0]) continue;
      
      const placaR = normalizePlaca(r[4]);
      const statusR = (r[12] || '').toString().toUpperCase().trim();
      
      if (placaR === placaNorm && isOpenStatus(statusR)) {
        return {
          monthLabel: m.monthLabel || monthLabel(m.year, m.month),
          status: statusR,
          key: m.key
        };
      }
    }
  }
  
  return null;
}

/**
 * Validação de placas duplicadas MODIFICADA (permite cross-month)
 * Agora apenas AVISA, não bloqueia
 */
async function validarPlacaAntesSalvar() {
  if (!hot) return true;
  
  const data = hot.getData();
  const duplicatasMesAtual = [];
  const crossMonthAvisos = [];
  
  // Verifica duplicatas no mês atual
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r[0]) continue;
    
    const placa = normalizePlaca(r[4]);
    if (!placa) continue;
    
    const status = (r[12] || '').toString().toUpperCase().trim();
    if (!isOpenStatus(status)) continue;
    
    // Verifica duplicata no mês atual
    const dupMesAtual = verificarPlacaDuplicadaMesAtual(placa, i);
    if (dupMesAtual && !duplicatasMesAtual.find(x => x.placa === placa)) {
      duplicatasMesAtual.push({ placa, status });
    }
    
    // Verifica cross-month
    const crossMonth = findOpenPlateInOtherMonths(placa);
    if (crossMonth && !crossMonthAvisos.find(x => x.placa === placa)) {
      crossMonthAvisos.push({ placa, ...crossMonth });
    }
  }
  
  // Se tem duplicata no mês atual, BLOQUEIA
  if (duplicatasMesAtual.length > 0) {
    const first = duplicatasMesAtual[0];
    
    await Swal.fire({
      title: '⚠️ PLACA DUPLICADA DETECTADA!',
      html: `
        <div class="text-left text-sm">
          <p class="mb-3">A placa <b>${first.placa}</b> já existe no mês atual com status <b>${first.status}</b>.</p>
          <p class="text-xs text-red-600">
            ❌ Não é permitido ter a mesma placa duplicada no mesmo mês.
          </p>
        </div>
      `,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#ef4444'
    });
    
    return false; // BLOQUEIA salvamento
  }
  
  // Se tem cross-month, apenas AVISA (não bloqueia)
  if (crossMonthAvisos.length > 0) {
    const first = crossMonthAvisos[0];
    
    const result = await Swal.fire({
      title: 'ℹ️ Placa já existe em outro mês',
      html: `
        <div class="text-left text-sm">
          <p class="mb-3">A placa <b>${first.placa}</b> está <b>${first.status}</b> em <b>${first.monthLabel}</b>.</p>
          <hr class="my-3">
          <p class="text-xs text-gray-600">
            💡 <b>Isso é normal</b> quando um evento começa em um mês e continua no próximo.
          </p>
          <p class="text-xs text-gray-600 mt-2">
            ✅ Quando finalizar, o sistema vai perguntar em qual mês quer marcar como finalizado.
          </p>
          <p class="text-xs text-blue-600 mt-3">
            <b>Deseja continuar salvando?</b>
          </p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '✅ Sim, salvar',
      cancelButtonText: '❌ Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    });
    
    return result.isConfirmed; // Salva se usuário confirmar
  }
  
  return true; // Nenhuma duplicata, pode salvar
}

// ============ 4. FUNÇÕES DE FINALIZAÇÃO CROSS-MONTH ============

/**
 * Verifica se evento está sendo finalizado em mês diferente do lançamento
 * @param {Array} row - Linha da planilha
 * @param {string} statusNovo - Novo status
 * @returns {boolean}
 */
function isCrossMonthFinalization(row, statusNovo) {
  // Se não está finalizando, não é cross-month
  if (statusNovo.toUpperCase().trim() !== 'FINALIZADO') return false;
  
  // Verifica se tem MÊS LANÇAMENTO (coluna 18)
  const mesLancamento = row[18];
  if (!mesLancamento) return false;
  
  // Compara com mês atual
  const mesAtual = monthLabel(currentYear, currentMonth);
  return mesLancamento !== mesAtual;
}

/**
 * Finaliza evento em mês diferente do lançamento
 * Cria registro de finalização sem duplicar gastos
 * @param {string} placa - Placa do veículo
 * @param {string} statusNovo - Novo status (FINALIZADO)
 */
async function finalizarEventoOutroMes(placa, statusNovo) {
  const placaNorm = normalizePlaca(placa);
  if (!placaNorm) return;
  
  // Busca evento em aberto em outros meses
  const months = getSavedMonths();
  let eventoOriginal = null;
  let mesOriginalKey = null;
  
  for (const m of months) {
    if (m.year === currentYear && m.month === currentMonth) continue;
    
    const rows = m.data || [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const placaR = normalizePlaca(r[4]);
      const statusR = (r[12] || '').toString().toUpperCase().trim();
      
      if (placaR === placaNorm && isOpenStatus(statusR)) {
        eventoOriginal = r;
        mesOriginalKey = m.key;
        break;
      }
    }
    if (eventoOriginal) break;
  }
  
  if (!eventoOriginal) {
    console.log('Evento não encontrado em outros meses');
    return;
  }
  
  // Confirmação com usuário
  const mesOriginalData = JSON.parse(localStorage.getItem(mesOriginalKey));
  const mesOriginalLabel = mesOriginalData.monthLabel || monthLabel(mesOriginalData.year, mesOriginalData.month);
  
  const result = await Swal.fire({
    title: '🔄 Finalizar evento de outro mês?',
    html: `
      <div class="text-left text-sm">
        <p class="mb-3"><b>Evento encontrado em:</b> ${mesOriginalLabel}</p>
        <p class="mb-3"><b>Placa:</b> ${placaNorm}</p>
        <p class="mb-3"><b>Gastos originais:</b> ${(parseFloat(eventoOriginal[11]) || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</p>
        <hr class="my-3">
        <p class="text-xs text-gray-600">
          ✅ <b>O que vai acontecer:</b><br>
          - ${mesOriginalLabel}: Mantém evento original com gastos<br>
          - ${monthLabel(currentYear, currentMonth)}: Cria registro de finalização <b>SEM gastos</b> (não duplica)
        </p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '✅ Sim, finalizar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#10b981'
  });
  
  if (!result.isConfirmed) return;
  
  // Cria registro de finalização no mês atual (SEM gastos)
  const registroFinalizacao = [
    eventoOriginal[0],  // ASSOCIAÇÃO
    eventoOriginal[1],  // BENEFICIÁRIO
    eventoOriginal[2],  // EVENTO TIPO
    eventoOriginal[3],  // VEÍCULO
    eventoOriginal[4],  // PLACA
    eventoOriginal[5],  // DATA OFICINA
    eventoOriginal[6],  // OFICINA
    0,                  // COTA = 0 (não duplica)
    0,                  // MÃO DE OBRA = 0
    0,                  // PEÇAS = 0
    0,                  // OUTRAS DESPESAS = 0
    0,                  // GASTOS TOTAIS = 0
    'FINALIZADO',       // SITUAÇÃO
    eventoOriginal[13], // CAUSADOR
    eventoOriginal[14], // JURÍDICO STATUS
    eventoOriginal[15], // DT ENVIO JURÍDICO
    eventoOriginal[16], // VALOR A RECUPERAR
    `Finalizado em ${monthLabel(currentYear, currentMonth)} - Lançado em ${mesOriginalLabel}`, // OBS
    mesOriginalLabel,   // MÊS LANÇAMENTO (coluna 18)
    monthLabel(currentYear, currentMonth), // MÊS FINALIZAÇÃO (coluna 19)
    'FINALIZAÇÃO'      // TIPO REGISTRO (coluna 20)
  ];
  
  // Adiciona linha na planilha atual
  const data = hot.getData();
  const emptyRow = data.findIndex(r => !r[0]);
  
  if (emptyRow >= 0) {
    hot.setDataAtRowProp(emptyRow, 0, registroFinalizacao);
  } else {
    hot.alter('insert_row', data.length, 1);
    hot.setDataAtRowProp(data.length, 0, registroFinalizacao);
  }
  
  // Salva mês atual
  saveCurrentMonth();
  updateDashboard();
  
  Swal.fire({
    icon: 'success',
    title: '✅ Finalizado!',
    html: `
      <div class="text-sm text-left">
        <p>✅ Registro de finalização criado com sucesso!</p>
        <p class="text-xs text-gray-600 mt-2">
          Os gastos permanecem em ${mesOriginalLabel} e não foram duplicados.
        </p>
      </div>
    `,
    confirmButtonText: 'OK'
  });
}

/**
 * Modifica saveCurrentMonthWithChecks para usar nova validação
 */
async function saveCurrentMonthWithChecksCrossMonth() {
  // Valida placas duplicadas (com aviso cross-month)
  const podeSalvar = await validarPlacaAntesSalvar();
  if (!podeSalvar) return;
  
  const rows = hot.getData();
  const crossMonthEvents = [];
  
  // Verifica eventos que estão sendo finalizados de outros meses
  rows.forEach((r, idx) => {
    if (!r[0]) return;
    
    const placa = normalizePlaca(r[4]);
    const status = (r[12] || '').toString().toUpperCase().trim();
    const mesLancamento = r[18]; // Coluna MÊS LANÇAMENTO
    const mesFinaliz = r[19];    // Coluna MÊS FINALIZAÇÃO
    const mesAtual = monthLabel(currentYear, currentMonth);
    
    // Se status é FINALIZADO e tem MÊS LANÇAMENTO diferente do atual
    if (status === 'FINALIZADO' && mesLancamento && mesLancamento !== mesAtual && !mesFinaliz) {
      crossMonthEvents.push({ rowIndex: idx, placa, mesLancamento });
    }
  });
  
  // Se encontrou eventos cross-month, processar
  if (crossMonthEvents.length > 0) {
    Swal.fire({
      title: '🔄 Finalizações Cross-Month Detectadas',
      html: `
        <div class="text-sm text-left">
          <p class="mb-2">Encontramos <b>${crossMonthEvents.length}</b> evento(s) sendo finalizado(s) de outro mês:</p>
          <ul class="text-xs space-y-1 mb-3">
            ${crossMonthEvents.slice(0, 5).map(e => `<li>• ${e.placa} (de ${e.mesLancamento})</li>`).join('')}
          </ul>
          <p class="text-xs text-gray-600">
            O sistema vai preencher automaticamente MÊS FINALIZAÇÃO e TIPO REGISTRO.
          </p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: '✅ OK, processar'
    }).then(() => {
      // Preenche campos automáticos
      crossMonthEvents.forEach(e => {
        hot.setDataAtCell(e.rowIndex, 19, mesAtual);        // MÊS FINALIZAÇÃO
        hot.setDataAtCell(e.rowIndex, 20, 'FINALIZAÇÃO'); // TIPO REGISTRO
      });
      
      // Salva
      saveCurrentMonth();
      setBadge();
      
      if (firebaseDb) {
        const md = saveCurrentMonth();
        firebaseDb.ref('months/' + monthKey(currentYear, currentMonth)).set(md)
          .then(() => Swal.fire('✅ Salvo!', 'Mês salvo e sincronizado.', 'success'))
          .catch(() => Swal.fire('✅ Salvo!', 'Mês salvo localmente.', 'success'));
      } else {
        Swal.fire('✅ Salvo!', 'Mês salvo com sucesso.', 'success');
      }
    });
    return;
  }
  
  // Salva normalmente
  saveCurrentMonth();
  setBadge();
  
  if (firebaseDb) {
    const md = saveCurrentMonth();
    firebaseDb.ref('months/' + monthKey(currentYear, currentMonth)).set(md)
      .then(() => Swal.fire('✅ Salvo!', 'Mês salvo e sincronizado com a nuvem.', 'success'))
      .catch(() => Swal.fire('✅ Salvo!', 'Mês salvo localmente.', 'success'));
  } else {
    Swal.fire('✅ Salvo!', 'Mês salvo com sucesso.', 'success');
  }
}

// ============ 5. MODIFICAÇÃO DO UPDATEDASHBOARD ============

/**
 * Adiciona KPI de eventos atrasados ao updateDashboard
 * Esta função deve ser chamada DENTRO do updateDashboard existente
 */
function updateDashboardAtrasados(data) {
  // Conta eventos atrasados
  let atrasados = 0;
  
  if (data && data.length) {
    data.forEach(r => {
      if (isEventoAtrasado(r)) {
        atrasados++;
      }
    });
  }
  
  // Atualiza KPI
  const kpiEl = document.getElementById('kpi-atrasados');
  if (kpiEl) {
    kpiEl.innerText = atrasados;
  }
  
  // Constrói painel de atrasados
  buildAtrasadosPanel(data);
}

// ============ 6. MODIFICAÇÃO DO INITHANDSONTABLE ============

/**
 * Adiciona 3 novas colunas ao Handsontable
 * Esta configuração deve substituir a atual no initHandsontable
 */
function getHandsontableConfigWith21Columns() {
  return {
    colHeaders: [
      'ASSOCIAÇÃO', 'BENEFICIÁRIO', 'EVENTO TIPO', 'VEÍCULO', 'PLACA', 'DATA OFICINA', 'OFICINA',
      'COTA', 'MÃO DE OBRA', 'PEÇAS', 'OUTRAS DESPESAS', 'GASTOS TOTAIS', 'SITUAÇÃO',
      'CAUSADOR', 'JURÍDICO STATUS', 'DT ENVIO JURÍDICO', 'VALOR A RECUPERAR', 'OBS JURÍDICO',
      'MÊS LANÇAMENTO', 'MÊS FINALIZAÇÃO', 'TIPO REGISTRO'
    ],
    columns: [
      { type: 'text' },
      { type: 'dropdown', source: ['ASSOCIADO', 'TERCEIRO'] },
      { type: 'dropdown', source: EVENTO_TIPO_OPTS },
      { type: 'text' },
      { type: 'text' },
      { type: 'date', dateFormat: 'DD/MM/YYYY', correctFormat: true },
      { type: 'dropdown', source: [] },
      { type: 'numeric', numericFormat: { pattern: '0,0.00', culture: 'pt-BR' } },
      { type: 'numeric', numericFormat: { pattern: '0,0.00', culture: 'pt-BR' } },
      { type: 'numeric', numericFormat: { pattern: '0,0.00', culture: 'pt-BR' } },
      { type: 'numeric', numericFormat: { pattern: '0,0.00', culture: 'pt-BR' } },
      { type: 'numeric', numericFormat: { pattern: '0,0.00', culture: 'pt-BR' }, readOnly: true },
      { type: 'dropdown', source: ['FINALIZADO', 'EM ANDAMENTO', 'NEGADO', 'PENDENTE', 'ACORDO'] },
      { type: 'dropdown', source: CAUSADOR_OPTS },
      { type: 'dropdown', source: JURIDICO_STATUS },
      { type: 'date', dateFormat: 'DD/MM/YYYY', correctFormat: true },
      { type: 'numeric', numericFormat: { pattern: '0,0.00', culture: 'pt-BR' } },
      { type: 'text' },
      // NOVAS COLUNAS
      { type: 'text', readOnly: true },  // MÊS LANÇAMENTO (preenchido automaticamente)
      { type: 'text', readOnly: true },  // MÊS FINALIZAÇÃO (preenchido automaticamente)
      { type: 'dropdown', source: ['ORIGINAL', 'FINALIZAÇÃO'], readOnly: true } // TIPO REGISTRO
    ]
  };
}

/**
 * Preenche MÊS LANÇAMENTO automaticamente ao criar nova linha
 * Adicionar ao afterChange do Handsontable
 */
function autoFillMesLancamento(changes) {
  if (!changes) return;
  
  changes.forEach(([row, col, oldVal, newVal]) => {
    // Se preencheu ASSOCIAÇÃO (coluna 0) e MÊS LANÇAMENTO está vazio
    if (col === 0 && newVal && !oldVal) {
      const mesLancamento = hot.getDataAtCell(row, 18);
      if (!mesLancamento) {
        hot.setDataAtCell(row, 18, monthLabel(currentYear, currentMonth), 'source');
        hot.setDataAtCell(row, 20, 'ORIGINAL', 'source');
      }
    }
    
    // Se mudou status para FINALIZADO
    if (col === 12 && newVal && newVal.toString().toUpperCase().trim() === 'FINALIZADO') {
      const mesLancamento = hot.getDataAtCell(row, 18);
      const mesFinaliz = hot.getDataAtCell(row, 19);
      const mesAtual = monthLabel(currentYear, currentMonth);
      
      // Se já tem MÊS LANÇAMENTO e é diferente do atual
      if (mesLancamento && mesLancamento !== mesAtual && !mesFinaliz) {
        hot.setDataAtCell(row, 19, mesAtual, 'source');        // MÊS FINALIZAÇÃO
        hot.setDataAtCell(row, 20, 'FINALIZAÇÃO', 'source'); // TIPO REGISTRO
      }
    }
  });
}

// ============ 7. SISTEMA DE ABAS DE NAVEGAÇÃO RÁPIDA ============

/**
 * Renderiza as abas de navegação rápida de meses
 * Exibe últimos 6 meses + botão para abrir navegador completo
 */
function renderMonthTabs() {
  const container = document.getElementById('month-tabs');
  if (!container) {
    console.warn('⚠️ Container #month-tabs não encontrado');
    return;
  }
  
  try {
    // Busca todos os meses salvos
    const months = getSavedMonths();
    
    // Ordena por ano e mês (mais recente primeiro)
    months.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    // Pega os últimos 6 meses
    const recentMonths = months.slice(0, 6);
    
    // Mês atual
    const currentKey = monthKey(currentYear, currentMonth);
    const currentLabel = monthLabel(currentYear, currentMonth);
    
    // Limpa container
    container.innerHTML = '';
    
    // Renderiza abas dos últimos 6 meses
    recentMonths.forEach(m => {
      const key = monthKey(m.year, m.month);
      const label = m.monthLabel || monthLabel(m.year, m.month);
      const isActive = key === currentKey;
      
      const tab = document.createElement('button');
      tab.className = `month-tab ${isActive ? 'month-tab-active' : 'month-tab-inactive'}`;
      tab.textContent = label;
      tab.title = `Clique para navegar para ${label}`;
      
      tab.onclick = () => {
        if (!isActive) {
          loadMonth(m.year, m.month);
          renderMonthTabs(); // Re-renderiza para atualizar destaque
          updateDashboard();
        }
      };
      
      container.appendChild(tab);
    });
    
    // Adiciona botão "+" para abrir navegador completo
    const moreBtn = document.createElement('button');
    moreBtn.className = 'month-tab month-tab-more';
    moreBtn.textContent = '+';
    moreBtn.title = 'Ver todos os meses';
    moreBtn.onclick = () => showMonthNavigator();
    
    container.appendChild(moreBtn);
    
    console.log(`✅ Abas de meses renderizadas: ${recentMonths.length} abas + botão +`);
    
  } catch (error) {
    console.error('❌ Erro ao renderizar abas de meses:', error);
    container.innerHTML = '<div class="month-tab month-tab-inactive" style="cursor: default;">Erro ao carregar meses</div>';
  }
}

/**
 * Inicializa o sistema de abas
 * Deve ser chamado após o carregamento do DOM e do app.js
 */
function initMonthTabs() {
  // Aguarda DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(renderMonthTabs, 500);
    });
  } else {
    setTimeout(renderMonthTabs, 500);
  }
}

// Auto-inicializa
initMonthTabs();

// ============================================================================
// INSTRUÇÕES DE INTEGRAÇÃO
// ============================================================================
//
// Para integrar estas funções no app.js existente:
//
// 1. SUBSTITUA a função kpiFilter pela kpiFilterNew
// 2. ADICIONE chamada updateDashboardAtrasados(data) no final do updateDashboard
// 3. SUBSTITUA configuração do initHandsontable usando getHandsontableConfigWith21Columns()
// 4. ADICIONE autoFillMesLancamento(changes) no afterChange do Handsontable
// 5. SUBSTITUA saveCurrentMonthWithChecks por saveCurrentMonthWithChecksCrossMonth
// 6. ADICIONE <script src="assets/melhorias-funcoes.js"></script> no index.html
// 7. CHAME renderMonthTabs() após carregar um mês em loadMonth() e ao salvar
// 8. CHAME renderMonthTabs() ao inicializar o sistema no onload
//
// ============================================================================

console.log('✅ Melhorias v2.2 carregadas: cross-month + abas de navegação');