# 🛠️ Instruções de Implementação - EventosPortoMais v2.0

**Data:** 10 de Fevereiro de 2026

Este documento contém as instruções passo a passo para implementar todas as melhorias no sistema.

---

## 📚 Índice

1. [Mudanças no index.html](#1-mudanças-no-indexhtml)
2. [Integração do melhorias-funcoes.js](#2-integração-do-melhorias-funcoesjs)
3. [Mudanças no app.js](#3-mudanças-no-appjs)
4. [Testes Recomendados](#4-testes-recomendados)
5. [Deploy](#5-deploy)

---

## 1. Mudanças no index.html

### 1.1. Adicionar script do melhorias-funcoes.js

No `<head>` do arquivo, ANTES do `<script src="assets/app.js"></script>`, adicione:

```html
<!-- Melhorias v2.0 -->
<script src="assets/melhorias-funcoes.js"></script>
```

**Localização:** Linha ~988 (antes do fechamento do `</body>`)

---

### 1.2. Adicionar KPI de Eventos Atrasados

Localizar a seção com os KPIs principais (linha ~794) e ADICIONAR este card após o card "Total de Eventos":

```html
<!-- NOVO KPI: EVENTOS EM ATRASO -->
<div class="kpi-card border-red-500" onclick="kpiFilterNew('atrasados')" style="border-image:linear-gradient(135deg, #ef4444 0%, #dc2626 100%) 1;">
  <p class="kpi-label">Eventos em Atraso</p>
  <p class="kpi-value" style="background:linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;" id="kpi-atrasados">0</p>
  <p class="kpi-sub">+40 dias na oficina</p>
</div>
```

**Onde adicionar:** Após o primeiro grid de KPIs (após linha ~800)

---

### 1.3. Adicionar Seção de Eventos Atrasados

Localizar a seção "Em aberto (eventos)" (linha ~830) e ADICIONAR esta nova seção ANTES dela:

```html
<!-- SEÇÃO: EVENTOS EM ATRASO -->
<div class="card mb-6">
  <div class="flex items-center justify-between mb-3">
    <h3 class="font-bold text-red-700 mb-4 text-lg flex items-center gap-2">
      ⏱️ Eventos em Atraso (+40 dias)
    </h3>
    <button class="btn btn-primary" onclick="kpiFilterNew('atrasados')">Ver na planilha</button>
  </div>
  <div id="atrasados-panel" class="text-sm text-gray-700"></div>
</div>
```

**Onde adicionar:** Após os gráficos e antes da seção "Em aberto" (linha ~828)

---

### 1.4. Adicionar Botão Limpar Filtros na Topbar

Localizar a topbar (linha ~763) e ADICIONAR este botão junto aos outros botões:

```html
<button class="month-nav-btn" onclick="clearFilters()" style="background:linear-gradient(135deg, #64748b 0%, #475569 100%);">
  ❌ Limpar Filtros
</button>
```

**Onde adicionar:** Na seção `.flex.items-center.gap-2` da topbar, após o botão "Navegar Meses"

---

## 2. Integração do melhorias-funcoes.js

O arquivo `assets/melhorias-funcoes.js` já foi criado e contém:

- ✅ Funções de eventos atrasados
- ✅ Funções de filtros corretos
- ✅ Funções de finalização cross-month
- ✅ Configuração das 21 colunas

**Ação necessária:** Apenas incluir o script no HTML conforme item 1.1

---

## 3. Mudanças no app.js

### 3.1. Substituir função kpiFilter

Localizar a função `kpiFilter` (linha ~810) e SUBSTITUIR todas as chamadas por `kpiFilterNew`.

Ou simplesmente adicionar no início do app.js:

```javascript
// Redireciona kpiFilter antiga para nova
function kpiFilter(key) {
  return kpiFilterNew(key);
}
```

---

### 3.2. Modificar updateDashboard

Localizar a função `updateDashboard` (linha ~700) e ADICIONAR no final, antes do fechamento:

```javascript
// Atualiza KPIs e painel de atrasados
updateDashboardAtrasados(data);
```

**Exemplo completo:**

```javascript
function updateDashboard(){
  let data=[]; 
  try{ data = hot.getData(); }catch(e){}

  // ... todo o código existente ...

  // ADICIONAR ESTA LINHA NO FINAL:
  updateDashboardAtrasados(data);
}
```

---

### 3.3. Modificar initHandsontable

Localizar a função `initHandsontable` (linha ~950) e:

**ANTES:**
```javascript
colHeaders: [
  'ASSOCIAÇÃO','BENEFICIÁRIO','EVENTO TIPO','VEÍCULO','PLACA','DATA OFICINA','OFICINA',
  'COTA','MÃO DE OBRA','PEÇAS','OUTRAS DESPESAS','GASTOS TOTAIS','SITUAÇÃO',
  'CAUSADOR','JURÍDICO STATUS','DT ENVIO JURÍDICO','VALOR A RECUPERAR','OBS JURÍDICO'
],
```

**DEPOIS:**
```javascript
colHeaders: [
  'ASSOCIAÇÃO','BENEFICIÁRIO','EVENTO TIPO','VEÍCULO','PLACA','DATA OFICINA','OFICINA',
  'COTA','MÃO DE OBRA','PEÇAS','OUTRAS DESPESAS','GASTOS TOTAIS','SITUAÇÃO',
  'CAUSADOR','JURÍDICO STATUS','DT ENVIO JURÍDICO','VALOR A RECUPERAR','OBS JURÍDICO',
  'MÊS LANÇAMENTO','MÊS FINALIZAÇÃO','TIPO REGISTRO'  // NOVAS COLUNAS
],
```

E adicionar as 3 novas colunas no array `columns`:

```javascript
columns: [
  // ... 18 colunas existentes ...
  { type:'text', readOnly:true },  // MÊS LANÇAMENTO
  { type:'text', readOnly:true },  // MÊS FINALIZAÇÃO
  { type:'dropdown', source:['ORIGINAL','FINALIZAÇÃO'], readOnly:true } // TIPO REGISTRO
]
```

---

### 3.4. Modificar afterChange do Handsontable

Dentro da função `initHandsontable`, localizar `afterChange` e ADICIONAR:

```javascript
afterChange(changes, source){
  if(!changes || source==='source') return;
  
  // Cálculo de gastos totais (existente)
  changes.forEach(([row, col])=>{
    if([7,8,9,10].includes(col)){
      const cota=parseFloat(this.getDataAtCell(row,7))||0;
      const mao=parseFloat(this.getDataAtCell(row,8))||0;
      const pecas=parseFloat(this.getDataAtCell(row,9))||0;
      const outras=parseFloat(this.getDataAtCell(row,10))||0;
      this.setDataAtCell(row,11, cota+mao+pecas+outras, 'source');
    }
  });
  
  // ADICIONAR ESTA LINHA:
  autoFillMesLancamento(changes);
  
  saveCurrentMonth(); 
  setBadge();
}
```

---

### 3.5. Substituir saveCurrentMonthWithChecks

Localizar TODAS as chamadas de `saveCurrentMonthWithChecks()` e SUBSTITUIR por:

```javascript
saveCurrentMonthWithChecksCrossMonth();
```

Ou adicionar alias no início do arquivo:

```javascript
// Alias para compatibilidade
function saveCurrentMonthWithChecks() {
  return saveCurrentMonthWithChecksCrossMonth();
}
```

---

## 4. Testes Recomendados

### Teste 1: Eventos Atrasados

1. Criar evento com DATA OFICINA de 50 dias atrás
2. Verificar que aparece no KPI "Eventos em Atraso"
3. Verificar que aparece na lista com cor amarela
4. Clicar no KPI e verificar que filtra na planilha

**Código para testar:**
```javascript
// No console do navegador:
const dataAntiga = new Date();
dataAntiga.setDate(dataAntiga.getDate() - 50);
const dataFormatada = `${dataAntiga.getDate()}/${dataAntiga.getMonth()+1}/${dataAntiga.getFullYear()}`;
console.log('Use esta data:', dataFormatada);
```

---

### Teste 2: Filtros Corretos

1. Clicar no card "Roubos"
2. Verificar que TODOS os roubos aparecem (não apenas o primeiro)
3. Verificar badge "Filtro Ativo" no topo
4. Clicar em "Limpar Filtros"
5. Verificar que todos os dados voltam

---

### Teste 3: Finalização Cross-Month

**Passo 1: Criar evento em Dezembro/2025**
1. Navegar para Dezembro/2025
2. Criar evento:
   - Placa: TEST-123
   - Gastos: R$ 5.000,00
   - Status: EM ANDAMENTO
3. Salvar
4. Verificar que MÊS LANÇAMENTO = "Dezembro 2025"
5. Verificar que TIPO REGISTRO = "ORIGINAL"

**Passo 2: Finalizar em Janeiro/2026**
1. Navegar para Janeiro/2026
2. Mudar status para FINALIZADO
3. Salvar
4. Sistema deve perguntar sobre finalização cross-month
5. Confirmar

**Passo 3: Verificar resultados**
1. Janeiro/2026 deve ter:
   - Placa: TEST-123
   - Gastos: R$ 0,00
   - Status: FINALIZADO
   - MÊS LANÇAMENTO: Dezembro 2025
   - MÊS FINALIZAÇÃO: Janeiro 2026
   - TIPO REGISTRO: FINALIZAÇÃO

2. Voltar para Dezembro/2025:
   - Placa: TEST-123
   - Gastos: R$ 5.000,00 (✅ mantidos)
   - Status: EM ANDAMENTO
   - MÊS LANÇAMENTO: Dezembro 2025

---

## 5. Deploy

### Opção A: Deploy Manual

1. Fazer backup completo:
   ```
   Configurações > Exportar Backup
   ```

2. Baixar arquivos do branch `melhorias-sistema`:
   - `index.html` (com modificações do item 1)
   - `assets/melhorias-funcoes.js` (novo arquivo)
   - `assets/app.js` (com modificações do item 3)

3. Substituir arquivos no servidor

4. Limpar cache do navegador (Ctrl+Shift+Del)

5. Testar todas as funcionalidades

---

### Opção B: Deploy via GitHub Pages

1. Fazer backup

2. Fazer merge do PR #5:
   ```
   https://github.com/Maralmhz/EventosPortoMais/pull/5
   ```

3. Aguardar deploy automático do GitHub Pages

4. Limpar cache e testar

---

## 📝 Checklist Final

### index.html
- [ ] Script melhorias-funcoes.js adicionado
- [ ] KPI "Eventos em Atraso" adicionado
- [ ] Seção de eventos atrasados adicionada
- [ ] Botão "Limpar Filtros" adicionado

### app.js
- [ ] kpiFilter redirecionado para kpiFilterNew
- [ ] updateDashboard chamando updateDashboardAtrasados
- [ ] initHandsontable com 21 colunas
- [ ] afterChange chamando autoFillMesLancamento
- [ ] saveCurrentMonthWithChecks redirecionado para CrossMonth

### Testes
- [ ] Eventos atrasados funcionando
- [ ] Filtros mostrando todos os resultados
- [ ] Finalização cross-month funcionando
- [ ] Gastos não duplicados
- [ ] Novas colunas visíveis e preenchidas

### Backup
- [ ] Backup completo realizado antes das mudanças
- [ ] Backup testado (importação funciona)

---

## ⚠️ Troubleshooting

### Problema: "kpiFilterNew is not defined"
**Solução:** Verificar se o script melhorias-funcoes.js foi carregado ANTES do app.js

### Problema: Filtros não funcionam
**Solução:** Limpar cache do navegador (Ctrl+Shift+Del)

### Problema: Colunas novas não aparecem
**Solução:** Verificar se initHandsontable foi atualizado com as 21 colunas

### Problema: Finalização cross-month não funciona
**Solução:** 
1. Verificar se saveCurrentMonthWithChecksCrossMonth está sendo chamado
2. Abrir console (F12) e verificar erros
3. Testar manualmente a função no console

---

## 📞 Suporte

Em caso de dúvidas:

1. Verificar documentação completa em `MUDANCAS.md`
2. Verificar console do navegador (F12)
3. Fazer backup antes de tentar correções
4. Reportar issue no GitHub com:
   - Mensagem de erro completa
   - Passos para reproduzir
   - Screenshot se possível

---

**Última atualização:** 10/02/2026  
**Versão:** 2.0  
**Status:** 🚦 Aguardando implementação
