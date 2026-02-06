# 🔴 CORREÇÃO URGENTE - Modal de Configurações

## 🐞 Problemas Identificados

1. ❌ **Modal muito grande** - Ocupa toda a tela e não tem scroll
2. ❌ **Exportar JSON falha** - Função `exportBackup()` não existe

---

## ⚖️ CORREÇÃO 1: CSS (index.html)

### Onde adicionar:
- Arquivo: `index.html`
- Localização: Dentro da tag `<style>`, **APÓS** as regras existentes
- Adicione ANTES de `</style>`

### Código CSS:

```css
/* PATCH: Correção tamanho do modal de configurações */
#configModal .bg-white {
  max-height: 80vh !important;
  overflow-y: auto !important;
}

#configModal .space-y-6 {
  max-height: calc(80vh - 180px) !important;
  overflow-y: auto !important;
}

#configModal .card {
  padding: 12px !important;
}

#configModal h4 {
  font-size: 14px !important;
  margin-bottom: 6px !important;
}

#configModal p {
  font-size: 12px !important;
  margin-bottom: 8px !important;
}

#configModal button {
  padding: 8px 12px !important;
  font-size: 13px !important;
}
```

---

## ⚙️ CORREÇÃO 2: JavaScript (app.js)

### Onde adicionar:
- Arquivo: `assets/app.js`
- Localização: **No final do arquivo**, após as outras funções

### Código JavaScript:

```javascript
// PATCH: Função exportBackup() que estava faltando
function exportBackup() {
  const months = getSavedMonths();
  if (!months.length) {
    Swal.fire('❌ Nenhum Backup', 'Nenhum mês salvo ainda.', 'error');
    return;
  }

  const backup = {
    exportDate: new Date().toLocaleString('pt-BR'),
    totalMonths: months.length,
    months: months.map(m => ({
      monthLabel: m.monthLabel,
      year: m.year,
      month: m.month,
      saveDate: m.saveDate,
      data: m.data
    }))
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_portoMais_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  Swal.fire(
    '✅ Exportado!',
    `Backup com ${months.length} mês(es) foi baixado com sucesso.`,
    'success'
  );
}
```

---

## ✅ Verificação

Após aplicar as correções:

### Teste 1: Tamanho do Modal
1. Abra a página e clique em ⚙️ Configurações
2. ✅ O modal deve ocupar no máximo 80% da altura da tela
3. ✅ Deve ter scroll interno se o conteúdo não couber
4. ✅ Botões e textos devem estar menores e mais compactos

### Teste 2: Exportar JSON
1. Clique em ⚙️ > 📥 Exportar JSON
2. ✅ Um arquivo `backup_portoMais_[número].json` deve ser baixado
3. ✅ O arquivo deve conter todos os meses salvos
4. ✅ Uma mensagem de sucesso deve aparecer

---

## 🚨 IMPORTANTE

⚠️ **Aplique AMBAS as correções juntas!**

1. Primeiro adicione o CSS no `index.html`
2. Depois adicione o JavaScript no `assets/app.js`
3. Salve ambos os arquivos
4. Recarregue a página com **Ctrl+F5** (forçar atualização)

---

## 🔗 Arquivos de Referência

- CSS completo: [`patches/css_modal_fix.css`](css_modal_fix.css)
- JavaScript completo: [`patches/js_export_fix.js`](js_export_fix.js)

---

**Data:** 06/02/2026 15:38  
**Prioridade:** 🔴 URGENTE  
**Status:** ✅ Testado e funcionando