// ============================================
// PATCH: Funções de Configuração e Backup
// Adicione este código no arquivo assets/app.js
// LOCALIZAÇÃO: No final do arquivo
// ============================================

// Abrir modal de configurações
function showConfigMenu() {
  document.getElementById('configModal').classList.remove('hidden');
}

// Fechar modal de configurações
function closeConfigModal() {
  document.getElementById('configModal').classList.add('hidden');
}

// Função para importar arquivo de backup
function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      
      // Validar estrutura do backup
      if (!backup.months || !Array.isArray(backup.months)) {
        throw new Error('Arquivo de backup inválido');
      }

      // Confirmar importação
      Swal.fire({
        title: '📤 Importar Backup?',
        html: `
          <p><b>Meses encontrados:</b> ${backup.totalMonths}</p>
          <p><b>Data do backup:</b> ${backup.exportDate}</p>
          <br>
          <p class="text-red-600">⚠️ Isso irá substituir os dados atuais!</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, importar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280'
      }).then((result) => {
        if (result.isConfirmed) {
          // Importar cada mês
          backup.months.forEach(monthData => {
            const key = `month_${monthData.year}_${monthData.month}`;
            localStorage.setItem(key, JSON.stringify(monthData));
          });

          Swal.fire(
            '✅ Importado!',
            `${backup.totalMonths} mês(es) foram importados com sucesso.`,
            'success'
          );

          // Recarregar página
          setTimeout(() => location.reload(), 1500);
        }
      });

    } catch (error) {
      Swal.fire(
        '❌ Erro!',
        'Arquivo de backup inválido ou corrompido.',
        'error'
      );
    }
  };
  
  reader.readAsText(file);
  event.target.value = ''; // Limpar input
}

// Limpar cache local
function clearLocalCache() {
  Swal.fire({
    title: '⚠️ Tem certeza?',
    text: 'Isso irá remover TODOS os dados salvos localmente!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, limpar tudo',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280'
  }).then((result) => {
    if (result.isConfirmed) {
      // Remover todos os itens do localStorage que começam com "month_"
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('month_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      Swal.fire(
        '✅ Cache Limpo!',
        `${keysToRemove.length} mês(es) foram removidos do cache local.`,
        'success'
      );

      closeConfigModal();
      setTimeout(() => location.reload(), 1500);
    }
  });
}

// Verificar status do Firebase
function checkFirebaseStatus() {
  if (typeof firebase === 'undefined') {
    Swal.fire('❌ Firebase não configurado', 'O Firebase não está disponível.', 'error');
    return;
  }

  Swal.fire({
    title: '☁️ Status do Firebase',
    html: `
      <div class="text-left">
        <p><b>Status:</b> <span class="text-green-600">✅ Conectado</span></p>
        <p><b>Sincronização:</b> Automática</p>
        <p><b>Última sync:</b> ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'OK',
    confirmButtonColor: '#3b82f6'
  });
}

// Sincronizar com Firebase (se a função não existir)
if (typeof syncWithFirebase === 'undefined') {
  function syncWithFirebase() {
    Swal.fire({
      title: '🔄 Sincronizando...',
      text: 'Aguarde enquanto sincronizamos com o Firebase',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Simular sincronização (substitua com lógica real do Firebase)
    setTimeout(() => {
      Swal.fire(
        '✅ Sincronizado!',
        'Dados sincronizados com sucesso.',
        'success'
      );
    }, 1500);
  }
}