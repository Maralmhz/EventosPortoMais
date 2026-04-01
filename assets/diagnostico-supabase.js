// ============================================================================
// DIAGNÓSTICO E SINCRONIZAÇÃO - Supabase
// ============================================================================
// Substitui o diagnostico-firebase.js (Firebase foi removido)
// Usa Supabase para diagnóstico e status de sincronização
// ============================================================================

/**
 * Diagnóstico do status Supabase
 */
async function diagnosticarSupabase() {
  console.log('====== DIAGNÓSTICO SUPABASE ======');

  // 1. Verifica se as funções Supabase estão disponíveis
  if (!window.supabaseLoadMonth || !window.supabaseListMonths) {
    console.error('❌ Supabase NÃO CARREGADO!');
    Swal.fire('Supabase Offline', 'Funções Supabase não estão disponíveis. Verifique js/supabase-config.js.', 'error');
    return;
  }

  console.log('✅ Funções Supabase disponíveis');

  Swal.fire({
    title: '🔍 Verificando Supabase...',
    html: 'Conectando ao banco de dados...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try {
    // 2. Lista meses na nuvem
    const cloudMonths = await window.supabaseListMonths();
    console.log(`☁️ Meses no Supabase: ${cloudMonths.length}`);

    // 3. Lista meses locais
    const localMonths = getSavedMonths ? getSavedMonths() : [];
    console.log(`📁 Meses locais (localStorage): ${localMonths.length}`);

    // 4. Compara
    const cloudKeys = new Set(cloudMonths.map(m => `${m.ano}-${m.mes}`));
    const localKeys = new Set(localMonths.map(m => m.key));

    const somenteNuvem = cloudMonths.filter(m => !localKeys.has(`month_${m.ano}_${m.mes}`));
    const somenteLocal = localMonths.filter(m => {
      const parts = m.key.split('_');
      if (parts.length >= 3) {
        const ano = parts[parts.length - 1];
        const mes = parts[parts.length - 2];
        return !cloudKeys.has(`${ano}-${mes}`);
      }
      return false;
    });

    Swal.fire({
      title: '📊 Status do Supabase',
      html: `
        <div class="text-left text-sm space-y-3">
          <div class="p-3 bg-gray-100 rounded">
            <p>✅ <b>Conexão:</b> Supabase conectado</p>
            <p>☁️ <b>Nuvem:</b> ${cloudMonths.length} mês(es) no Supabase</p>
            <p>📱 <b>Local:</b> ${localMonths.length} mês(es) no localStorage</p>
          </div>

          ${cloudMonths.length > 0 ? `
          <div>
            <p class="font-bold text-green-600 mb-2">☁️ Meses no Supabase:</p>
            ${cloudMonths.map(m => `<p class="text-xs ml-3">• ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m.mes-1]}/${m.ano}</p>`).join('')}
          </div>` : '<p class="text-yellow-600 font-bold">⚠️ Nenhum dado no Supabase ainda</p>'}

          ${somenteNuvem.length > 0 ? `
          <div class="p-2 bg-blue-50 border-l-4 border-blue-500">
            <p class="font-bold text-blue-700">☁️ Apenas na nuvem (${somenteNuvem.length}):</p>
            ${somenteNuvem.map(m => `<p class="text-xs ml-2">• ${m.mes}/${m.ano}</p>`).join('')}
          </div>` : ''}

          ${somenteLocal.length > 0 ? `
          <div class="p-2 bg-yellow-50 border-l-4 border-yellow-500">
            <p class="font-bold text-yellow-700">📱 Apenas local (${somenteLocal.length}):</p>
            ${somenteLocal.map(m => `<p class="text-xs ml-2">• ${m.monthLabel || m.key}</p>`).join('')}
          </div>` : ''}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'OK',
      width: 600
    });

  } catch (e) {
    console.error('Erro ao conectar Supabase:', e);
    Swal.fire('❌ Erro', 'Não foi possível conectar ao Supabase: ' + e.message, 'error');
  }
}

/**
 * Envia dados locais para o Supabase
 */
async function uploadToSupabase() {
  if (!window.supabaseSaveMonth) {
    Swal.fire('Supabase Offline', 'Funções Supabase não disponíveis', 'error');
    return;
  }

  const months = getSavedMonths ? getSavedMonths() : [];
  if (months.length === 0) {
    Swal.fire('⚠️ Sem Dados', 'Não há meses salvos localmente para enviar.', 'info');
    return;
  }

  const confirm = await Swal.fire({
    title: '📤 Enviar para Supabase?',
    html: `<p>Você tem <b>${months.length} mês(es)</b> salvos localmente.</p><p class="mt-2">Estes dados serão enviados para o Supabase.</p>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '📤 Enviar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#10b981'
  });

  if (!confirm.isConfirmed) return;

  Swal.fire({
    title: '📤 Enviando para Supabase...',
    html: `Enviando ${months.length} mês(es)...`,
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  let sucesso = 0;
  let erros = 0;

  for (const month of months) {
    try {
      const result = await window.supabaseSaveMonth(month.month, month.year, month.data || []);
      if (result && result.ok !== false) {
        sucesso++;
      } else {
        erros++;
      }
    } catch (e) {
      console.error('Erro ao enviar mês:', month.key, e);
      erros++;
    }
  }

  Swal.fire({
    icon: sucesso > 0 ? 'success' : 'error',
    title: sucesso > 0 ? '✅ Enviado!' : '❌ Erro',
    html: `<p>✅ ${sucesso} mês(es) enviado(s) com sucesso</p>${erros > 0 ? `<p class="text-red-600">❌ ${erros} erro(s)</p>` : ''}`,
    confirmButtonText: 'OK'
  });
}

/**
 * Baixa dados do Supabase para localStorage
 */
async function downloadFromSupabase() {
  if (!window.supabaseListMonths || !window.supabaseLoadMonth) {
    Swal.fire('Supabase Offline', 'Funções Supabase não disponíveis', 'error');
    return;
  }

  const confirm = await Swal.fire({
    title: '📥 Baixar do Supabase?',
    html: '<p>Isto vai CARREGAR os dados do Supabase para o navegador.</p><p class="mt-2 text-sm text-gray-600">Dados locais existentes NÃO serão apagados.</p>',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '📥 Baixar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#f59e0b'
  });

  if (!confirm.isConfirmed) return;

  Swal.fire({
    title: '📥 Baixando do Supabase...',
    html: 'Buscando meses disponíveis...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try {
    const cloudMonths = await window.supabaseListMonths();

    if (cloudMonths.length === 0) {
      Swal.fire('⚠️ Nuvem Vazia', 'Não há dados no Supabase para baixar.', 'warning');
      return;
    }

    let baixados = 0;

    for (const { mes, ano } of cloudMonths) {
      const rows = await window.supabaseLoadMonth(mes, ano);
      if (rows && rows.length > 0) {
        const key = `month_${ano}_${mes}`;
        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        localStorage.setItem(key, JSON.stringify({
          key,
          year: ano,
          month: mes,
          monthLabel: `${monthNames[mes-1]} ${ano}`,
          saveDate: new Date().toLocaleString('pt-BR'),
          data: rows
        }));
        baixados++;
      }
    }

    // Atualiza interface
    if (typeof renderMonthTabs === 'function') renderMonthTabs();
    if (typeof updateDashboard === 'function') updateDashboard();

    Swal.fire({
      icon: 'success',
      title: '✅ Download Concluído!',
      html: `<p>${baixados} mês(es) baixado(s) do Supabase!</p>`,
      confirmButtonText: 'OK'
    });

  } catch (e) {
    console.error('Erro ao baixar do Supabase:', e);
    Swal.fire('Erro', 'Falha ao baixar: ' + e.message, 'error');
  }
}

/**
 * Status da conexão Supabase (substitui diagnosticarFirebase)
 */
async function statusSupabase() {
  await diagnosticarSupabase();
}

// Aliases para compatibilidade com o HTML existente
window.uploadToFirebase = uploadToSupabase;
window.downloadFromFirebase = downloadFromSupabase;
window.statusFirebase = statusSupabase;
window.diagnosticarFirebase = diagnosticarSupabase;

// Novas funções Supabase expostas globalmente
window.uploadToSupabase = uploadToSupabase;
window.downloadFromSupabase = downloadFromSupabase;
window.statusSupabase = statusSupabase;
window.diagnosticarSupabase = diagnosticarSupabase;

console.log('✅ Diagnóstico Supabase carregado. Use:');
console.log(' - diagnosticarSupabase() para ver status');
console.log(' - uploadToSupabase() para enviar dados para nuvem');
console.log(' - downloadFromSupabase() para baixar da nuvem');
