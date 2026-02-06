// ============================================
// PATCH JavaScript: Função exportBackup()
// Adicione este código no assets/app.js
// Localização: No final do arquivo
// ============================================

/**
 * Exporta backup de todos os meses salvos em arquivo JSON
 * Gera arquivo com formato: backup_portoMais_[timestamp].json
 */
function exportBackup() {
  // Buscar todos os meses salvos
  const months = getSavedMonths();
  
  // Validar se há dados para exportar
  if (!months.length) {
    Swal.fire(
      '❌ Nenhum Backup',
      'Nenhum mês salvo ainda. Adicione alguns eventos primeiro.',
      'error'
    );
    return;
  }

  // Criar objeto de backup estruturado
  const backup = {
    exportDate: new Date().toLocaleString('pt-BR'),
    totalMonths: months.length,
    version: '2.0',
    app: 'Gerenciador de Eventos - Porto Mais',
    months: months.map(m => ({
      monthLabel: m.monthLabel,
      year: m.year,
      month: m.month,
      saveDate: m.saveDate,
      data: m.data,
      totalEvents: (m.data || []).filter(row => row[0]).length
    }))
  };

  // Gerar arquivo JSON
  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' }
  );
  
  // Criar URL temporária para download
  const url = URL.createObjectURL(blob);
  
  // Criar elemento <a> para forçar download
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_portoMais_${Date.now()}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Limpar URL temporária
  URL.revokeObjectURL(url);

  // Mostrar mensagem de sucesso
  Swal.fire({
    icon: 'success',
    title: '✅ Exportado!',
    html: `
      <div class="text-left">
        <p><b>Backup gerado com sucesso!</b></p>
        <ul class="mt-2 text-sm">
          <li>✅ ${months.length} mês(es) exportado(s)</li>
          <li>📅 Data: ${new Date().toLocaleDateString('pt-BR')}</li>
          <li>💾 Arquivo: backup_portoMais_${Date.now()}.json</li>
        </ul>
        <p class="mt-3 text-xs text-gray-600">
          💡 Guarde este arquivo em local seguro. Ele contém todos os seus dados.
        </p>
      </div>
    `,
    confirmButtonText: 'OK',
    confirmButtonColor: '#3b82f6'
  });
}

// Função auxiliar: Fechar modal após exportar
function exportBackupAndClose() {
  exportBackup();
  setTimeout(() => {
    closeConfigModal();
  }, 2000);
}