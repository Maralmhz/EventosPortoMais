// ============================================================
//  SUPABASE CONFIG — EventosPortoMais
//  Substitui o Firebase Realtime Database pelo Supabase
// ============================================================

const SUPABASE_URL  = 'https://xjgyijfogxefmvfnwwbh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZ3lpamZvZ3hlZm12Zm53d2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTM3NTYsImV4cCI6MjA5MDYyOTc1Nn0.WCEUnEkswLZXow8xwMBscYdBRZxK1BkW7skI-WS2rFQ';

// ============================================================
//  MAPEAMENTO: índices do array Handsontable → colunas SQL
//  Baseado na estrutura do backup JSON (18 colunas no Dez/2025)
//  [0]filial [1]tipo_parte [2]tipo_sinistro [3]veiculo [4]placa
//  [5]data_ocorrencia [6]oficina [7]valor_pecas [8]valor_servicos
//  [9]valor_franquia [10]valor_outros [11]valor_total [12]status
//  [13]causador [14]juridico_status [15]juridico_valor
//  [16]categoria [17]observacoes
// ============================================================

const COL = {
  FILIAL:          0,
  TIPO_PARTE:      1,
  TIPO_SINISTRO:   2,
  VEICULO:         3,
  PLACA:           4,
  DATA_OCORRENCIA: 5,
  OFICINA:         6,
  VALOR_PECAS:     7,
  VALOR_SERVICOS:  8,
  VALOR_FRANQUIA:  9,
  VALOR_OUTROS:    10,
  VALOR_TOTAL:     11,
  STATUS:          12,
  CAUSADOR:        13,
  JURIDICO_STATUS: 14,
  JURIDICO_VALOR:  15,
  CATEGORIA:       16,
  OBSERVACOES:     17,
};

// ============================================================
//  CLIENTE HTTP LEVE (sem SDK — usa fetch direto na API REST)
// ============================================================
const sb = {
  headers: {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },

  async query(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: this.headers,
      ...opts,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase error ${res.status}: ${err}`);
    }
    return res.json().catch(() => []);
  },

  // SELECT
  async select(table, params = '') {
    return this.query(`${table}?${params}`);
  },

  // INSERT (array de objetos)
  async insert(table, rows) {
    return this.query(table, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(rows),
    });
  },

  // UPDATE por id
  async update(table, id, data) {
    return this.query(`${table}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // DELETE por id
  async delete(table, id) {
    return this.query(`${table}?id=eq.${id}`, { method: 'DELETE' });
  },

  // UPSERT (insert ou update pelo id)
  async upsert(table, rows) {
    return this.query(table, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(rows),
    });
  },
};

// ============================================================
//  CONVERSOR: linha do Handsontable → objeto SQL
// ============================================================
function rowToEvento(row, mes, ano) {
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  function str(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s.toUpperCase();
  }
  function strRaw(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  }
  function date(v) {
    if (!v) return null;
    // Aceita DD/MM/YYYY ou YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
      const [d, m, y] = v.split('/');
      return `${y}-${m}-${d}`;
    }
    return v;
  }

  return {
    filial:          str(row[COL.FILIAL]),
    tipo_parte:      str(row[COL.TIPO_PARTE]),
    tipo_sinistro:   str(row[COL.TIPO_SINISTRO]),
    veiculo:         str(row[COL.VEICULO]),
    placa:           str(row[COL.PLACA]),
    data_ocorrencia: date(row[COL.DATA_OCORRENCIA]),
    oficina:         strRaw(row[COL.OFICINA]),
    valor_pecas:     num(row[COL.VALOR_PECAS]),
    valor_servicos:  num(row[COL.VALOR_SERVICOS]),
    valor_franquia:  num(row[COL.VALOR_FRANQUIA]),
    valor_outros:    strRaw(row[COL.VALOR_OUTROS]),
    valor_total:     num(row[COL.VALOR_TOTAL]),
    status:          str(row[COL.STATUS]),
    causador:        str(row[COL.CAUSADOR]),
    juridico_status: str(row[COL.JURIDICO_STATUS]),
    juridico_valor:  num(row[COL.JURIDICO_VALOR]),
    categoria:       str(row[COL.CATEGORIA]),
    observacoes:     strRaw(row[COL.OBSERVACOES]),
    mes_referencia:  mes,
    ano_referencia:  ano,
  };
}

// ============================================================
//  CONVERSOR INVERSO: objeto SQL → linha do Handsontable
// ============================================================
function eventoToRow(e) {
  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  return [
    e.filial         || '',
    e.tipo_parte     || '',
    e.tipo_sinistro  || '',
    e.veiculo        || '',
    e.placa          || '',
    fmtDate(e.data_ocorrencia),
    e.oficina        || '',
    e.valor_pecas    ?? '',
    e.valor_servicos ?? '',
    e.valor_franquia ?? '',
    e.valor_outros   || '',
    e.valor_total    ?? 0,
    e.status         || '',
    e.causador       || '',
    e.juridico_status || '',
    e.juridico_valor  ?? '',
    e.categoria      || '',
    e.observacoes    || '',
    e.id,  // coluna oculta — ID do banco para updates/deletes
  ];
}

// ============================================================
//  API PÚBLICA — usada pelo app.js e features.js
// ============================================================

/** Carrega todos os eventos de um mês/ano do Supabase */
async function supabaseLoadMonth(mes, ano) {
  try {
    const rows = await sb.select(
      'eventos',
      `mes_referencia=eq.${mes}&ano_referencia=eq.${ano}&order=id.asc&limit=500`
    );
    return rows.map(eventoToRow);
  } catch (e) {
    console.error('❌ supabaseLoadMonth:', e);
    return [];
  }
}

/** Salva todas as linhas do mês (apaga as antigas e reinsere) */
async function supabaseSaveMonth(mes, ano, rows) {
  try {
    // 1. Apaga registros antigos do mês
    await fetch(
      `${SUPABASE_URL}/rest/v1/eventos?mes_referencia=eq.${mes}&ano_referencia=eq.${ano}`,
      { method: 'DELETE', headers: sb.headers }
    );

    // 2. Filtra linhas vazias
    const validas = rows.filter(r => r && r[COL.FILIAL] && String(r[COL.FILIAL]).trim() !== '');
    if (validas.length === 0) return { ok: true, count: 0 };

    // 3. Insere novamente
    const objs = validas.map(r => rowToEvento(r, mes, ano));
    await sb.insert('eventos', objs);

    console.log(`✅ Supabase: ${objs.length} eventos salvos (${mes}/${ano})`);
    return { ok: true, count: objs.length };
  } catch (e) {
    console.error('❌ supabaseSaveMonth:', e);
    return { ok: false, error: e.message };
  }
}

/** Retorna lista de meses disponíveis no banco */
async function supabaseListMonths() {
  try {
    const rows = await sb.select(
      'eventos',
      'select=mes_referencia,ano_referencia&order=ano_referencia.desc,mes_referencia.desc'
    );
    const seen = new Set();
    return rows
      .filter(r => {
        const k = `${r.ano_referencia}-${r.mes_referencia}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(r => ({ mes: r.mes_referencia, ano: r.ano_referencia }));
  } catch (e) {
    console.error('❌ supabaseListMonths:', e);
    return [];
  }
}

/** Deleta uma linha pelo ID do banco (coluna oculta na planilha) */
async function supabaseDeleteRow(id) {
  try {
    await sb.delete('eventos', id);
    return { ok: true };
  } catch (e) {
    console.error('❌ supabaseDeleteRow:', e);
    return { ok: false };
  }
}

/** Busca eventos por placa (histórico do veículo) */
async function supabaseSearchByPlaca(placa) {
  try {
    return await sb.select(
      'eventos',
      `placa=ilike.*${placa}*&order=data_ocorrencia.desc&limit=100`
    );
  } catch (e) {
    return [];
  }
}

/** Busca full-text em veiculo, placa ou oficina */
async function supabaseSearch(termo) {
  try {
    const t = encodeURIComponent(termo.toUpperCase());
    return await sb.select(
      'eventos',
      `or=(veiculo.ilike.*${t}*,placa.ilike.*${t}*,oficina.ilike.*${t}*)&order=data_ocorrencia.desc&limit=200`
    );
  } catch (e) {
    return [];
  }
}

// Expõe no escopo global para compatibilidade com app.js e features.js
window.supabaseLoadMonth   = supabaseLoadMonth;
window.supabaseSaveMonth   = supabaseSaveMonth;
window.supabaseListMonths  = supabaseListMonths;
window.supabaseDeleteRow   = supabaseDeleteRow;
window.supabaseSearch      = supabaseSearch;
window.supabaseSearchByPlaca = supabaseSearchByPlaca;
window.COL                 = COL;
window.rowToEvento         = rowToEvento;
window.eventoToRow         = eventoToRow;

console.log('✅ Supabase config carregado — EventosPortoMais');
