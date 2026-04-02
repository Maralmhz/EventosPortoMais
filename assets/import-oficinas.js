// 📦 IMPORTADOR DE OFICINAS PARCEIRAS
// Carrega oficinas do arquivo JSON e salva no armazenamento local

/**
 * Carrega o arquivo JSON de oficinas e importa no armazenamento local
 */
async function importarOficinasDoJSON() {
  try {
    console.log('📥 Iniciando importação de oficinas...');
    
    // Busca o arquivo JSON
    const response = await fetch('data/oficinas-parceiras.json');
    if (!response.ok) {
      throw new Error('Erro ao carregar arquivo de oficinas');
    }
    
    const data = await response.json();
    console.log(`📄 Arquivo carregado: ${data.metadados.totalOficinas} oficinas encontradas`);
    
    // Carrega oficinas existentes (somente local)
    const oficinasSalvas = carregarOficinasLocal();
    console.log(`💾 Oficinas já cadastradas: ${oficinasSalvas.length}`);
    
    // Filtra oficinas novas (sem duplicatas)
    const oficinasNovas = filtrarOficinasNovas(data.oficinas, oficinasSalvas);
    console.log(`✨ Oficinas novas a importar: ${oficinasNovas.length}`);
    
    if (oficinasNovas.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sem novidades',
        text: 'Todas as oficinas já estão cadastradas!',
      });
      return;
    }
    
    // Confirma importação
    const result = await Swal.fire({
      icon: 'question',
      title: 'Importar Oficinas?',
      html: `
        <div style="text-align: left;">
          <p><b>🏪 Novas oficinas encontradas:</b> ${oficinasNovas.length}</p>
          <ul style="max-height: 200px; overflow-y: auto;">
            ${oficinasNovas.slice(0, 10).map(o => `<li>${o.nome} - ${o.cidade}</li>`).join('')}
            ${oficinasNovas.length > 10 ? `<li>... e mais ${oficinasNovas.length - 10}</li>` : ''}
          </ul>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '📥 Importar',
      cancelButtonText: 'Cancelar',
    });
    
    if (!result.isConfirmed) return;
    
    // Salva localmente
    salvarOficinasLocal([...oficinasSalvas, ...oficinasNovas]);
    
    // Atualiza interface
    if (typeof renderOficinasList === 'function') {
      renderOficinasList();
    }
    
    Swal.fire({
      icon: 'success',
      title: 'Importação Concluída!',
      html: `
        <p>✅ <b>${oficinasNovas.length} oficinas</b> importadas com sucesso!</p>
        <p>📊 Total no sistema: <b>${oficinasSalvas.length + oficinasNovas.length}</b></p>
      `,
    });
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro na Importação',
      text: error.message,
    });
  }
}

/**
 * Carrega oficinas do localStorage
 */
function carregarOficinasLocal() {
  try {
    return JSON.parse(localStorage.getItem('oficinas') || '[]');
  } catch (error) {
    console.error('Erro ao carregar oficinas locais:', error);
    return [];
  }
}

/**
 * Filtra oficinas novas (evita duplicatas por CNPJ ou nome)
 */
function filtrarOficinasNovas(novasOficinas, oficinasSalvas) {
  return novasOficinas.filter(nova => {
    // Verifica duplicata por CNPJ (se existir)
    if (nova.cnpj && nova.cnpj.trim()) {
      const cnpjLimpo = nova.cnpj.replace(/[^0-9]/g, '');
      const existePorCNPJ = oficinasSalvas.some(salva => {
        const cnpjSalvoLimpo = (salva.cnpj || '').replace(/[^0-9]/g, '');
        return cnpjSalvoLimpo && cnpjSalvoLimpo === cnpjLimpo;
      });
      if (existePorCNPJ) return false;
    }
    
    // Verifica duplicata por nome (50% de similaridade)
    const existePorNome = oficinasSalvas.some(salva => {
      const nomeNova = (nova.nome || '').toLowerCase().trim();
      const nomeSalva = (salva.nome || '').toLowerCase().trim();
      return nomeNova === nomeSalva;
    });
    
    return !existePorNome;
  });
}

/**
 * Salva oficinas no LocalStorage
 */
function salvarOficinasLocal(oficinas) {
  try {
    localStorage.setItem('oficinas', JSON.stringify(oficinas));
    console.log(`💾 ${oficinas.length} oficinas salvas localmente`);
  } catch (error) {
    console.error('Erro ao salvar localmente:', error);
  }
}

/**
 * Exporta oficinas atuais para JSON (backup)
 */
function exportarOficinasParaJSON() {
  const oficinas = JSON.parse(localStorage.getItem('oficinas') || '[]');
  
  const dataExport = {
    oficinas: oficinas,
    metadados: {
      versao: '1.0',
      dataExportacao: new Date().toISOString(),
      totalOficinas: oficinas.length
    }
  };
  
  const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oficinas-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  Swal.fire({
    icon: 'success',
    title: 'Backup criado!',
    text: `${oficinas.length} oficinas exportadas com sucesso.`,
  });
}

/**
 * Limpa todas as oficinas (com confirmação)
 */
async function limparTodasOficinas() {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Tem certeza?',
    text: 'Isso removerá TODAS as oficinas do sistema!',
    showCancelButton: true,
    confirmButtonText: '🗑️ Sim, limpar tudo',
    confirmButtonColor: '#dc2626',
    cancelButtonText: 'Cancelar',
  });
  
  if (!result.isConfirmed) return;
  
  try {
    // Remove local
    localStorage.removeItem('oficinas');
    
    // Atualiza interface
    if (typeof renderOficinasList === 'function') {
      renderOficinasList();
    }
    
    Swal.fire({
      icon: 'success',
      title: 'Oficinas removidas',
      text: 'Todas as oficinas foram excluídas do sistema.',
    });
  } catch (error) {
    console.error('Erro ao limpar oficinas:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Não foi possível limpar as oficinas.',
    });
  }
}

// Exporta funções globalmente
window.importarOficinasDoJSON = importarOficinasDoJSON;
window.exportarOficinasParaJSON = exportarOficinasParaJSON;
window.limparTodasOficinas = limparTodasOficinas;

console.log('📦 Módulo de importação de oficinas carregado');
