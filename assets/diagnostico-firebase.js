// ============================================================================
// DIAGNÓSTICO E CORREÇÃO - Firebase Sync
// ============================================================================
// Script para diagnosticar e corrigir problemas de sincronização
// ============================================================================

/**
 * Exibe console detalhado do Firebase
 */
function diagnosticarFirebase() {
  console.log('====== DIAGNÓSTICO FIREBASE ======');
  
  // 1. Verifica conexão
  if (!firebaseDb) {
    console.error('❌ Firebase NÃO CONECTADO!');
    Swal.fire('Firebase Offline', 'Conexão não estabelecida. Verifique credenciais.', 'error');
    return;
  }
  
  console.log('✅ Firebase CONECTADO');
  
  // 2. Lista meses locais
  const localMonths = getSavedMonths();
  console.log(`📁 Meses locais: ${localMonths.length}`);
  localMonths.forEach(m => {
    console.log(`  - ${m.monthLabel} (${m.key}): ${m.data?.length || 0} linhas`);
  });
  
  // 3. Busca meses na nuvem
  firebaseDb.ref('months').once('value', snapshot => {
    const cloudData = snapshot.val();
    if (!cloudData) {
      console.log('☁️ Nuvem VAZIA - nenhum mês salvo no Firebase');
      
      Swal.fire({
        title: '☁️ Nuvem Vazia',
        html: `
          <div class="text-left text-sm">
            <p class="mb-3">Você tem <b>${localMonths.length} mês(es)</b> salvos <u>apenas localmente</u>.</p>
            <p class="text-red-600 font-bold mb-3">⚠️ Se limpar o navegador, perderá tudo!</p>
            <hr class="my-3">
            <p class="text-blue-600">💡 <b>Solução:</b> Clique em "Enviar para Nuvem" agora para fazer backup.</p>
          </div>
        `,
        icon: 'warning',
        confirmButtonText: '📤 Enviar para Nuvem Agora',
        showCancelButton: true,
        cancelButtonText: 'Depois'
      }).then(result => {
        if (result.isConfirmed) {
          uploadToFirebase();
        }
      });
      return;
    }
    
    const cloudMonths = Object.keys(cloudData);
    console.log(`☁️ Meses na nuvem: ${cloudMonths.length}`);
    cloudMonths.forEach(key => {
      const m = cloudData[key];
      console.log(`  - ${m.monthLabel || key}: ${m.data?.length || 0} linhas (salvo em ${m.saveDate})`);
    });
    
    // 4. Compara local vs nuvem
    const localKeys = new Set(localMonths.map(m => m.key));
    const cloudKeys = new Set(cloudMonths);
    
    const somenteLocal = [...localKeys].filter(k => !cloudKeys.has(k));
    const somenteNuvem = [...cloudKeys].filter(k => !localKeys.has(k));
    const emAmbos = [...localKeys].filter(k => cloudKeys.has(k));
    
    console.log('\n====== COMPARAÇÃO ======');
    console.log(`✅ Em ambos: ${emAmbos.length}`);
    console.log(`📱 Somente local: ${somenteLocal.length}`, somenteLocal);
    console.log(`☁️ Somente nuvem: ${somenteNuvem.length}`, somenteNuvem);
    
    // Mostra relatório visual
    Swal.fire({
      title: '📊 Relatório Firebase',
      html: `
        <div class="text-left text-sm space-y-3">
          <div class="p-3 bg-gray-100 rounded">
            <p><b>📱 Local:</b> ${localMonths.length} mês(es)</p>
            <p><b>☁️ Nuvem:</b> ${cloudMonths.length} mês(es)</p>
          </div>
          
          <hr>
          
          <div>
            <p class="font-bold text-green-600">✅ Sincronizados: ${emAmbos.length}</p>
            ${emAmbos.length > 0 ? `<p class="text-xs text-gray-600">${emAmbos.map(k => localMonths.find(m => m.key === k)?.monthLabel || k).join(', ')}</p>` : ''}
          </div>
          
          ${somenteLocal.length > 0 ? `
            <div class="p-2 bg-yellow-50 border-l-4 border-yellow-500">
              <p class="font-bold text-yellow-700">📱 Somente no computador (${somenteLocal.length}):</p>
              <p class="text-xs">${somenteLocal.map(k => localMonths.find(m => m.key === k)?.monthLabel || k).join(', ')}</p>
              <p class="text-xs text-yellow-600 mt-2">⚠️ Estes NÃO estão na nuvem!</p>
            </div>
          ` : ''}
          
          ${somenteNuvem.length > 0 ? `
            <div class="p-2 bg-blue-50 border-l-4 border-blue-500">
              <p class="font-bold text-blue-700">☁️ Somente na nuvem (${somenteNuvem.length}):</p>
              <p class="text-xs">${somenteNuvem.map(k => cloudData[k]?.monthLabel || k).join(', ')}</p>
              <p class="text-xs text-blue-600 mt-2">💡 Baixe para acessar neste computador</p>
            </div>
          ` : ''}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'OK',
      width: 600
    });
  });
}

/**
 * Sincronização bidirecional completa
 * - Envia meses locais que não estão na nuvem
 * - Baixa meses da nuvem que não estão localmente
 * - Resolve conflitos (mantém o mais recente)
 */
async function sincronizacaoCompleta() {
  if (!firebaseDb) {
    Swal.fire('Firebase Offline', 'Conexão não disponível', 'error');
    return;
  }
  
  Swal.fire({
    title: '🔄 Sincronização Completa',
    html: 'Comparando dados local vs nuvem...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
  
  try {
    // Busca dados da nuvem
    const snapshot = await firebaseDb.ref('months').once('value');
    const cloudData = snapshot.val() || {};
    
    const localMonths = getSavedMonths();
    const localKeys = new Set(localMonths.map(m => m.key));
    const cloudKeys = new Set(Object.keys(cloudData));
    
    let enviados = 0;
    let baixados = 0;
    let atualizados = 0;
    let conflitos = [];
    
    // 1. ENVIA meses locais que não estão na nuvem
    for (const month of localMonths) {
      if (!cloudKeys.has(month.key)) {
        await firebaseDb.ref('months/' + month.key).set({
          year: month.year,
          month: month.month,
          monthLabel: month.monthLabel,
          saveDate: new Date().toLocaleString('pt-BR'),
          data: month.data
        });
        enviados++;
      }
    }
    
    // 2. BAIXA meses da nuvem que não estão localmente
    for (const [key, cloudMonth] of Object.entries(cloudData)) {
      if (!localKeys.has(key)) {
        localStorage.setItem(key, JSON.stringify(cloudMonth));
        baixados++;
      } else {
        // 3. Verifica CONFLITOS (ambos têm o mês)
        const localMonth = JSON.parse(localStorage.getItem(key));
        const cloudDate = new Date(cloudMonth.saveDate || 0);
        const localDate = new Date(localMonth.saveDate || 0);
        
        if (cloudDate > localDate) {
          // Nuvem é mais recente
          localStorage.setItem(key, JSON.stringify(cloudMonth));
          atualizados++;
          conflitos.push({ key, winner: 'nuvem', cloudDate, localDate });
        } else if (localDate > cloudDate) {
          // Local é mais recente
          await firebaseDb.ref('months/' + key).set({
            year: localMonth.year,
            month: localMonth.month,
            monthLabel: localMonth.monthLabel,
            saveDate: new Date().toLocaleString('pt-BR'),
            data: localMonth.data
          });
          atualizados++;
          conflitos.push({ key, winner: 'local', cloudDate, localDate });
        }
      }
    }
    
    // Atualiza interface
    renderMonthTabs();
    updateDashboard();
    
    // Mostra resultado
    Swal.fire({
      icon: 'success',
      title: '✅ Sincronização Completa!',
      html: `
        <div class="text-left text-sm space-y-2">
          <p>📤 <b>${enviados}</b> mês(es) enviado(s) para nuvem</p>
          <p>📥 <b>${baixados}</b> mês(es) baixado(s) da nuvem</p>
          <p>🔄 <b>${atualizados}</b> mês(es) atualizado(s)</p>
          ${conflitos.length > 0 ? `
            <hr class="my-2">
            <p class="text-xs text-gray-600"><b>Conflitos resolvidos:</b></p>
            ${conflitos.map(c => `
              <p class="text-xs">• ${c.key}: mantido versão da <b>${c.winner === 'nuvem' ? '☁️ nuvem' : '📱 local'}</b></p>
            `).join('')}
          ` : ''}
        </div>
      `,
      confirmButtonText: 'OK',
      width: 500
    });
    
  } catch (error) {
    console.error('Erro na sincronização:', error);
    Swal.fire('Erro', 'Falha na sincronização: ' + error.message, 'error');
  }
}

/**
 * Limpa meses duplicados do localStorage
 */
function limparDuplicatas() {
  Swal.fire({
    title: '🔍 Procurando duplicatas...',
    html: 'Analisando localStorage...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
  
  const months = getSavedMonths();
  const seen = new Set();
  const duplicatas = [];
  
  months.forEach(m => {
    const id = `${m.year}_${m.month}`;
    if (seen.has(id)) {
      duplicatas.push(m);
    } else {
      seen.add(id);
    }
  });
  
  if (duplicatas.length === 0) {
    Swal.fire('✅ Sem Duplicatas', 'Não foram encontradas duplicatas no localStorage.', 'success');
    return;
  }
  
  Swal.fire({
    title: '⚠️ Duplicatas Encontradas!',
    html: `
      <div class="text-left text-sm">
        <p class="mb-3">Encontradas <b>${duplicatas.length}</b> duplicata(s):</p>
        <ul class="space-y-1 mb-3">
          ${duplicatas.map(m => `<li>• ${m.monthLabel} (${m.key})</li>`).join('')}
        </ul>
        <p class="text-red-600 font-bold">Deseja remover as duplicatas?</p>
        <p class="text-xs text-gray-600 mt-2">(Manteremos apenas a versão mais recente de cada mês)</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '🗑️ Sim, limpar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ef4444'
  }).then(result => {
    if (result.isConfirmed) {
      duplicatas.forEach(m => {
        localStorage.removeItem(m.key);
      });
      
      renderMonthTabs();
      updateDashboard();
      
      Swal.fire('✅ Limpeza Concluída!', `${duplicatas.length} duplicata(s) removida(s).`, 'success');
    }
  });
}

/**
 * Força reload completo da nuvem (sobrescreve tudo local)
 */
function forcarBaixarTudoDaNuvem() {
  if (!firebaseDb) {
    Swal.fire('Firebase Offline', 'Conexão não disponível', 'error');
    return;
  }
  
  Swal.fire({
    title: '⚠️ AVISO IMPORTANTE',
    html: `
      <div class="text-left text-sm">
        <p class="mb-3 text-red-600 font-bold">Isto vai SUBSTITUIR todos os dados locais pelos da nuvem!</p>
        <p class="mb-3">Seus dados locais atuais serão perdidos se não estiverem na nuvem.</p>
        <hr class="my-3">
        <p class="text-blue-600"><b>Use esta opção se:</b></p>
        <ul class="text-xs space-y-1 ml-4 mb-3">
          <li>• Você está em outro computador</li>
          <li>• Quer baixar os dados salvos anteriormente</li>
          <li>• Tem certeza que a nuvem tem a versão correta</li>
        </ul>
        <p class="text-gray-600 text-xs">💡 Recomendação: Faça um backup local primeiro (Exportar Backup)</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '📥 SIM, baixar tudo',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ef4444'
  }).then(async result => {
    if (result.isConfirmed) {
      Swal.fire({
        title: '📥 Baixando da nuvem...',
        html: 'Isto pode levar alguns segundos...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      try {
        // Limpa TUDO do localStorage relacionado a meses
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('month_')) {
            localStorage.removeItem(key);
          }
        }
        
        // Baixa da nuvem
        const snapshot = await firebaseDb.ref('months').once('value');
        const cloudData = snapshot.val();
        
        if (!cloudData || Object.keys(cloudData).length === 0) {
          Swal.fire('⚠️ Nuvem Vazia', 'Não há dados na nuvem para baixar.', 'warning');
          return;
        }
        
        // Salva tudo localmente
        let count = 0;
        for (const [key, cloudMonth] of Object.entries(cloudData)) {
          localStorage.setItem(key, JSON.stringify(cloudMonth));
          count++;
        }
        
        // Carrega o mês mais recente
        const months = getSavedMonths();
        if (months.length > 0) {
          const latest = months[0];
          currentYear = latest.year;
          currentMonth = latest.month;
          hot.loadData(latest.data || [[""]]);
          setBadge();
          renderMonthTabs();
          updateDashboard();
        }
        
        Swal.fire({
          icon: 'success',
          title: '✅ Download Concluído!',
          html: `<p>${count} mês(es) baixado(s) da nuvem com sucesso!</p>`,
          confirmButtonText: 'OK'
        });
        
      } catch (error) {
        console.error('Erro ao baixar:', error);
        Swal.fire('Erro', 'Falha ao baixar: ' + error.message, 'error');
      }
    }
  });
}

/**
 * Força envio completo para nuvem (sobrescreve tudo na nuvem)
 */
function forcarEnviarTudoParaNuvem() {
  if (!firebaseDb) {
    Swal.fire('Firebase Offline', 'Conexão não disponível', 'error');
    return;
  }
  
  const months = getSavedMonths();
  if (months.length === 0) {
    Swal.fire('⚠️ Sem Dados', 'Não há meses salvos localmente para enviar.', 'info');
    return;
  }
  
  Swal.fire({
    title: '📤 Enviar TUDO para Nuvem?',
    html: `
      <div class="text-left text-sm">
        <p class="mb-3">Você tem <b>${months.length} mês(es)</b> salvos localmente.</p>
        <p class="mb-3">Isto vai SOBRESCREVER os dados na nuvem.</p>
        <hr class="my-3">
        <p class="text-blue-600"><b>Use esta opção se:</b></p>
        <ul class="text-xs space-y-1 ml-4">
          <li>• Você fez alterações importantes localmente</li>
          <li>• Quer garantir que a nuvem tenha sua versão</li>
          <li>• A nuvem está desatualizada</li>
        </ul>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '📤 SIM, enviar tudo',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#10b981'
  }).then(async result => {
    if (result.isConfirmed) {
      Swal.fire({
        title: '📤 Enviando para nuvem...',
        html: `Enviando ${months.length} mês(es)...`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      try {
        let count = 0;
        for (const month of months) {
          await firebaseDb.ref('months/' + month.key).set({
            year: month.year,
            month: month.month,
            monthLabel: month.monthLabel,
            saveDate: new Date().toLocaleString('pt-BR'),
            data: month.data
          });
          count++;
        }
        
        Swal.fire({
          icon: 'success',
          title: '✅ Enviado!',
          html: `<p>${count} mês(es) enviado(s) para a nuvem com sucesso!</p>`,
          confirmButtonText: 'OK'
        });
        
      } catch (error) {
        console.error('Erro ao enviar:', error);
        Swal.fire('Erro', 'Falha ao enviar: ' + error.message, 'error');
      }
    }
  });
}

console.log('✅ Diagnóstico Firebase carregado. Use:');
console.log('  - diagnosticarFirebase() para ver status');
console.log('  - sincronizacaoCompleta() para sync bidirecional');
console.log('  - limparDuplicatas() para remover duplicatas');
console.log('  - forcarBaixarTudoDaNuvem() para download completo');
console.log('  - forcarEnviarTudoParaNuvem() para upload completo');