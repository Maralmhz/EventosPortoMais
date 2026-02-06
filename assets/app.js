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

// [... resto do código continua igual até a função importBackupFile ...]

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

// ==================================================
// FUNÇÃO CORRIGIDA: handleImportFile()
// ==================================================
function handleImportFile(event) {
  const file = event.target.files[0];
  
  if (!file) {
    console.log('❌ Nenhum arquivo selecionado');
    return;
  }

  // Validar extensão
  if (!file.name.toLowerCase().endsWith('.json')) {
    Swal.fire({
      icon: 'error',
      title: '❌ Arquivo Inválido',
      text: 'Selecione um arquivo JSON (.json)',
      confirmButtonColor: '#ef4444'
    });
    return;
  }

  // Loading
  Swal.fire({
    title: '📤 Importando...',
    html: '<p class="text-sm">Lendo e validando arquivo...</p>',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  const reader = new FileReader();
  
  reader.onerror = () => {
    Swal.fire({
      icon: 'error',
      title: '❌ Erro de Leitura',
      text: 'Não foi possível ler o arquivo',
      confirmButtonColor: '#ef4444'
    });
  };
  
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      
      // Validação
      if (!backup.months || !Array.isArray(backup.months)) {
        throw new Error('Estrutura inválida. Arquivo não é um backup válido.');
      }

      if (backup.months.length === 0) {
        throw new Error('Backup vazio.');
      }

      // Contar eventos
      let totalEvents = 0;
      backup.months.forEach(m => {
        if (m.data && Array.isArray(m.data)) {
          totalEvents += m.data.filter(row => row && row[0]).length;
        }
      });

      // Confirmação
      Swal.fire({
        title: '📥 Confirmar Importação?',
        html: `
          <div class="text-left text-sm">
            <p class="mb-3"><b>📊 Resumo do Backup:</b></p>
            <ul class="space-y-1 bg-blue-50 p-3 rounded">
              <li>📅 <b>Meses:</b> ${backup.months.length}</li>
              <li>📝 <b>Eventos:</b> ${totalEvents}</li>
              <li>🗓️ <b>Exportado:</b> ${backup.exportDate || 'N/A'}</li>
            </ul>
            <div class="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p class="text-yellow-800 font-bold text-xs">⚠️ ATENÇÃO</p>
              <p class="text-yellow-700 text-xs mt-1">
                Meses existentes serão SUBSTITUÍDOS!
              </p>
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '✅ Importar',
        cancelButtonText: '❌ Cancelar',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        width: '500px'
      }).then((result) => {
        if (result.isConfirmed) {
          let success = 0, errors = 0;

          backup.months.forEach(m => {
            try {
              if (!m.year || !m.month) {
                errors++;
                return;
              }

              const key = monthKey(m.year, m.month);
              const data = {
                year: m.year,
                month: m.month,
                monthLabel: m.monthLabel || monthLabel(m.year, m.month),
                saveDate: m.saveDate || new Date().toLocaleString('pt-BR'),
                data: m.data || []
              };

              localStorage.setItem(key, JSON.stringify(data));
              success++;
              
            } catch (err) {
              console.error('Erro importando mês:', err);
              errors++;
            }
          });

          // Recarregar último mês
          const months = getSavedMonths();
          if (months.length > 0) {
            const latest = months[0];
            currentYear = latest.year;
            currentMonth = latest.month;
            if (hot) hot.loadData(latest.data || []);
            setBadge();
            updateDashboard();
          }

          // Sync Firebase
          if (firebaseDb) {
            syncToFirebase();
          }

          // Resultado
          Swal.fire({
            icon: 'success',
            title: '✅ Importado!',
            html: `
              <div class="text-left text-sm">
                <p class="mb-2"><b>Resultado:</b></p>
                <ul class="space-y-1">
                  <li>✅ ${success} mês(es) importado(s)</li>
                  ${errors > 0 ? `<li>⚠️ ${errors} erro(s)</li>` : ''}
                </ul>
              </div>
            `,
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981'
          }).then(() => {
            closeConfigModal();
            go('dash');
          });
        }
      });

    } catch (error) {
      console.error('Erro processando backup:', error);
      
      Swal.fire({
        icon: 'error',
        title: '❌ Erro na Importação',
        html: `
          <div class="text-left text-sm">
            <p class="mb-2"><b>Falha ao importar:</b></p>
            <p class="text-red-600 font-mono text-xs mb-3">${error.message}</p>
            <div class="bg-blue-50 p-2 rounded text-xs">
              <b>💡 Verifique:</b>
              <ul class="mt-1 space-y-1">
                <li>• Arquivo gerado pelo sistema</li>
                <li>• Arquivo não corrompido</li>
                <li>• Formato JSON válido</li>
              </ul>
            </div>
          </div>
        `,
        confirmButtonText: 'Entendi'
      });
    }
  };

  reader.readAsText(file);
  event.target.value = '';
}

function importBackupFile(){
  const i = document.createElement('input');
  i.type='file'; i.accept='.json';
  i.onchange = handleImportFile;
  i.click();
}

// [... resto do código continua igual ...]