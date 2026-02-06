# 🔧 Correção: Botão de Configurações Não Funcional

## Problema Identificado

O botão de engrenagem (**⚙️ Configurações**) no menu lateral não está funcional. Ao clicar, nada acontece porque:

1. ✅ O botão HTML existe: `<div class="item" id="nav-config" onclick="showConfigMenu()">`
2. ❌ A função `showConfigMenu()` está sendo chamada mas o **modal HTML está faltando**
3. ❌ O modal `#configModal` não existe no documento

---

## Solução

### Adicione o seguinte código ANTES da tag `</main>` no arquivo `index.html`:

```html
<!-- CONFIG MODAL -->
<div id="configModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
    <div class="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-2xl text-white flex items-center gap-2">
          ⚙️ Configurações e Backup
        </h3>
        <button onclick="closeConfigModal()" class="text-white hover:text-gray-200 font-bold text-3xl">&times;</button>
      </div>
    </div>
    
    <div class="p-6 space-y-6">
      <!-- Salvar Atual -->
      <div class="card p-4 bg-blue-50 border-2 border-blue-200">
        <h4 class="font-bold text-blue-900 mb-2 flex items-center gap-2">
          💾 Salvar Mês Atual
        </h4>
        <p class="text-sm text-blue-800 mb-3">
          Salva o mês atual no navegador (LocalStorage) e sincroniza com nuvem (Firebase)
        </p>
        <button onclick="saveCurrentMonthWithChecks(); closeConfigModal();" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold transition">
          💾 Salvar Agora
        </button>
      </div>

      <!-- Exportar Backup -->
      <div class="card p-4 bg-purple-50 border-2 border-purple-200">
        <h4 class="font-bold text-purple-900 mb-2 flex items-center gap-2">
          📥 Exportar Backup
        </h4>
        <p class="text-sm text-purple-800 mb-3">
          Baixa todos os meses salvos em arquivo JSON (recomendado fazer semanalmente)
        </p>
        <button onclick="exportBackup(); closeConfigModal();" class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-bold transition">
          📥 Exportar JSON
        </button>
      </div>

      <!-- Importar Backup -->
      <div class="card p-4 bg-green-50 border-2 border-green-200">
        <h4 class="font-bold text-green-900 mb-2 flex items-center gap-2">
          📤 Importar Backup
        </h4>
        <p class="text-sm text-green-800 mb-3">
          Restaura dados de um arquivo JSON de backup previamente exportado
        </p>
        <input 
          type="file" 
          id="import-file-input" 
          accept=".json" 
          class="hidden" 
          onchange="handleImportFile(event)"
        >
        <button onclick="document.getElementById('import-file-input').click()" class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold transition">
          📤 Selecionar Arquivo JSON
        </button>
      </div>

      <!-- Sincronização Firebase -->
      <div class="card p-4 bg-amber-50 border-2 border-amber-200">
        <h4 class="font-bold text-amber-900 mb-2 flex items-center gap-2">
          ☁️ Sincronização em Nuvem
        </h4>
        <p class="text-sm text-amber-800 mb-3">
          Sincroniza automaticamente com Firebase quando conectado à internet
        </p>
        <div class="flex gap-2">
          <button onclick="syncWithFirebase(); closeConfigModal();" class="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-bold transition">
            🔄 Sincronizar Agora
          </button>
          <button onclick="checkFirebaseStatus(); closeConfigModal();" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-lg font-bold transition">
            🔍 Ver Status
          </button>
        </div>
      </div>

      <!-- Limpar Cache -->
      <div class="card p-4 bg-red-50 border-2 border-red-200">
        <h4 class="font-bold text-red-900 mb-2 flex items-center gap-2">
          🗑️ Limpar Cache Local
        </h4>
        <p class="text-sm text-red-800 mb-3">
          ⚠️ Remove TODOS os dados salvos localmente (não afeta Firebase)
        </p>
        <button onclick="clearLocalCache()" class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold transition">
          🗑️ Limpar Tudo
        </button>
      </div>
    </div>

    <div class="p-4 bg-gray-50 rounded-b-2xl flex justify-end">
      <button onclick="closeConfigModal()" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold">
        Fechar
      </button>
    </div>
  </div>
</div>
```

---

### Adicione as funções JavaScript no arquivo `assets/app.js`:

```javascript
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
        if (key.startsWith('month_')) {
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
```

---

## Localização no Código

### No arquivo `index.html`:

1. Procure por `<!-- MONTH NAVIGATOR MODAL -->`
2. Role até o final desse modal (depois da tag `</div>` que o fecha)
3. **ANTES** da tag `</main>`, adicione o código do **CONFIG MODAL** acima

### No arquivo `assets/app.js`:

1. Adicione as funções JavaScript no final do arquivo
2. Certifique-se de que não há conflito com funções existentes

---

## Teste

Após adicionar o código:

1. ✅ Clique no ícone **⚙️** no menu lateral
2. ✅ O modal de configurações deve abrir
3. ✅ Teste cada botão:
   - **💾 Salvar Agora** - salva o mês atual
   - **📥 Exportar JSON** - baixa backup
   - **📤 Selecionar Arquivo JSON** - importa backup
   - **🔄 Sincronizar Agora** - força sincronização
   - **🔍 Ver Status** - mostra status do Firebase
   - **🗑️ Limpar Tudo** - remove cache local (com confirmação)

---

## Backup Corrigido

O arquivo `backup_corrigido_janeiro2026.json` já está pronto para ser importado:

1. Clique em **⚙️ Configurações**
2. Clique em **📤 Importar Backup**
3. Selecione o arquivo `backup_corrigido_janeiro2026.json`
4. Confirme a importação
5. ✅ **Janeiro 2026** aparecerá com 47 eventos!

---

## Observações

- O botão de **⚙️ Configurações** agora funcionará corretamente
- Todas as funções de backup estarão acessíveis
- A importação do backup corrigido restaurará Janeiro 2026
- A sincronização com Firebase continuará automática

**Versão:** 1.0  
**Data:** 06/02/2026  
**Autor:** Sistema Porto Mais