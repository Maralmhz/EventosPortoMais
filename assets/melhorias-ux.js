// ============ MELHORIAS DE UX ============
// ✅ Busca inteligente com lupa
// ✅ Destaque da linha inteira ao editar
// ✅ Atalhos de teclado
// ✅ Contador de linhas

console.log('🎨 Melhorias de UX carregadas!');

// ============ BUSCA INTELIGENTE ============
function buscarNaPlanilha() {
  const termo = document.getElementById('search-input').value.trim().toLowerCase();
  
  if (!termo) {
    Swal.fire('Atenção', 'Digite algo para buscar (placa, nome, veículo...)', 'warning');
    return;
  }
  
  const data = hot.getData();
  const resultados = [];
  
  data.forEach((row, idx) => {
    if (!row[0]) return; // Pula linhas vazias
    
    // Busca em múltiplas colunas
    const associacao = (row[0] || '').toString().toLowerCase();
    const beneficiario = (row[1] || '').toString().toLowerCase();
    const eventoTipo = (row[2] || '').toString().toLowerCase();
    const veiculo = (row[3] || '').toString().toLowerCase();
    const placa = (row[4] || '').toString().toLowerCase();
    const oficina = (row[6] || '').toString().toLowerCase();
    const situacao = (row[12] || '').toString().toLowerCase();
    
    if (
      associacao.includes(termo) ||
      beneficiario.includes(termo) ||
      eventoTipo.includes(termo) ||
      veiculo.includes(termo) ||
      placa.includes(termo) ||
      oficina.includes(termo) ||
      situacao.includes(termo)
    ) {
      resultados.push(idx);
    }
  });
  
  if (resultados.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Nenhum resultado',
      text: `Nada encontrado para "${termo}"`,
      confirmButtonText: 'OK'
    });
    return;
  }
  
  // Mostra resultados
  if (resultados.length === 1) {
    // Se encontrou 1, vai direto
    go('data');
    setTimeout(() => {
      hot.selectCell(resultados[0], 0, resultados[0], 17);
      hot.scrollViewportTo(resultados[0], 0);
    }, 100);
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `✅ Encontrado!`,
      timer: 2000,
      showConfirmButton: false
    });
  } else {
    // Múltiplos resultados
    mostrarResultadosBusca(resultados, termo, data);
  }
}

function mostrarResultadosBusca(indices, termo, data) {
  let html = `
    <div class="text-left">
      <p class="mb-3 text-sm"><b>🔍 Encontrados ${indices.length} resultado(s) para:</b> "${termo}"</p>
      <div style="max-height: 400px; overflow-y: auto;">
  `;
  
  indices.forEach((idx, position) => {
    const row = data[idx];
    const placa = row[4] || 'Sem placa';
    const veiculo = row[3] || 'N/D';
    const beneficiario = row[1] || 'N/D';
    const situacao = row[12] || 'N/D';
    
    html += `
      <div 
        class="p-3 mb-2 border rounded cursor-pointer hover:bg-blue-50 transition"
        onclick="irParaLinha(${idx}); Swal.close();">
        <div class="font-bold text-blue-600">🔹 Linha ${idx + 1}: ${placa}</div>
        <div class="text-xs text-gray-600 mt-1">
          <b>Veículo:</b> ${veiculo} | <b>Beneficiário:</b> ${beneficiario}<br>
          <b>Situação:</b> ${situacao}
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  
  Swal.fire({
    title: '🔍 Resultados da Busca',
    html: html,
    width: '600px',
    confirmButtonText: 'Fechar',
    confirmButtonColor: '#3b82f6'
  });
}

function irParaLinha(rowIndex) {
  go('data');
  setTimeout(() => {
    hot.selectCell(rowIndex, 0, rowIndex, 17); // Seleciona linha inteira
    hot.scrollViewportTo(rowIndex, 0);
  }, 100);
}

function limparBusca() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-input').focus();
}

// ============ DESTAQUE DA LINHA ATIVA ============
function destacarLinhaAtiva() {
  if (!hot) return;
  
  // Remove destaque anterior
  const planilha = document.getElementById('spreadsheet');
  if (!planilha) return;
  
  // Adiciona CSS para linha ativa
  const style = document.createElement('style');
  style.id = 'linha-ativa-style';
  style.innerHTML = `
    /* Destaque da linha selecionada */
    .handsontable tbody tr td.area {
      background: #dbeafe !important;
    }
    
    .handsontable tbody tr td.current {
      background: #93c5fd !important;
      border: 2px solid #3b82f6 !important;
    }
    
    /* Linha inteira destacada */
    .handsontable tbody tr.highlighted-row td {
      background: #f0f9ff !important;
      border-top: 2px solid #3b82f6 !important;
      border-bottom: 2px solid #3b82f6 !important;
    }
    
    .handsontable tbody tr.highlighted-row td:first-child {
      border-left: 4px solid #3b82f6 !important;
    }
    
    .handsontable tbody tr.highlighted-row td:last-child {
      border-right: 4px solid #3b82f6 !important;
    }
  `;
  
  // Remove estilo anterior se existir
  const oldStyle = document.getElementById('linha-ativa-style');
  if (oldStyle) oldStyle.remove();
  
  document.head.appendChild(style);
  
  // Adiciona evento para destacar linha ao selecionar
  hot.addHook('afterSelection', function(row, col, row2, col2) {
    // Remove destaque anterior
    document.querySelectorAll('.highlighted-row').forEach(tr => {
      tr.classList.remove('highlighted-row');
    });
    
    // Adiciona destaque na linha atual
    const tbody = document.querySelector('#spreadsheet tbody');
    if (tbody && tbody.rows[row]) {
      tbody.rows[row].classList.add('highlighted-row');
    }
  });
  
  console.log('✅ Destaque de linha ativa configurado!');
}

// ============ ATALHOS DE TECLADO ============
function configurarAtalhos() {
  document.addEventListener('keydown', function(e) {
    // Ctrl + F = Buscar
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    
    // Ctrl + S = Salvar
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveCurrentMonthWithChecks();
    }
    
    // Ctrl + D = Dashboard
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      go('dash');
    }
    
    // Ctrl + E = Editar dados (planilha)
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      go('data');
    }
    
    // ESC = Limpar seleção
    if (e.key === 'Escape' && hot) {
      hot.deselectCell();
    }
  });
  
  console.log('✅ Atalhos de teclado configurados!');
  console.log('   • Ctrl+F = Buscar');
  console.log('   • Ctrl+S = Salvar');
  console.log('   • Ctrl+D = Dashboard');
  console.log('   • Ctrl+E = Editar dados');
}

// ============ CONTADOR DE LINHAS ============
function atualizarContador() {
  if (!hot) return;
  
  const data = hot.getData();
  const total = data.filter(r => r[0]).length;
  
  const badge = document.getElementById('linha-count');
  if (badge) {
    badge.innerText = `${total} evento${total !== 1 ? 's' : ''}`;
  }
}

// ============ NAVEGAÇÃO RÁPIDA ============
function proximaLinhaVazia() {
  if (!hot) return;
  
  const data = hot.getData();
  let primeiraVazia = -1;
  
  for (let i = 0; i < data.length; i++) {
    if (!data[i][0]) {
      primeiraVazia = i;
      break;
    }
  }
  
  if (primeiraVazia !== -1) {
    hot.selectCell(primeiraVazia, 0);
    hot.scrollViewportTo(primeiraVazia, 0);
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `📄 Linha ${primeiraVazia + 1} (vazia)`,
      timer: 1500,
      showConfirmButton: false
    });
  } else {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'Sem linhas vazias',
      timer: 1500,
      showConfirmButton: false
    });
  }
}

function ultimaLinhaPreenchida() {
  if (!hot) return;
  
  const data = hot.getData();
  let ultima = -1;
  
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0]) {
      ultima = i;
      break;
    }
  }
  
  if (ultima !== -1) {
    hot.selectCell(ultima, 0, ultima, 17);
    hot.scrollViewportTo(ultima, 0);
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `🎯 Última linha: ${ultima + 1}`,
      timer: 1500,
      showConfirmButton: false
    });
  }
}

// ============ INICIALIZAÇÃO ============
setTimeout(() => {
  if (typeof hot !== 'undefined' && hot) {
    destacarLinhaAtiva();
    configurarAtalhos();
    atualizarContador();
    
    // Atualiza contador ao editar
    hot.addHook('afterChange', function() {
      setTimeout(atualizarContador, 100);
    });
    
    console.log('🚀 Todas as melhorias de UX ativadas!');
  }
}, 2500);
