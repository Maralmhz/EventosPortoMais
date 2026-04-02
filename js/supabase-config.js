// ============================================================
// SUPABASE CONFIG — EventosPortoMais
// Autenticação via PIN + CRUD de eventos
// ============================================================
const SUPABASE_URL = 'https://xjgyijfogxefmvfnwwbh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZ3lpamZvZ3hlZm12Zm53d2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTM3NTYsImV4cCI6MjA5MDYyOTc1Nn0.WCEUnEkswLZXow8xwMBscYdBRZxK1BkW7skI-WS2rFQ';

// ============================================================
// MÊS PADRÃO = MÊS ATUAL (não o anterior)
// ============================================================
const _hoje = new Date();
const MES_PADRAO = _hoje.getMonth() + 1; // getMonth() retorna 0-11, somamos 1
const ANO_PADRAO = _hoje.getFullYear();

// ============================================================
// MAPEAMENTO: índices do array Handsontable → colunas SQL
// ============================================================
const COL = {
  FILIAL: 0,
  TIPO_PARTE: 1,
  TIPO_SINISTRO: 2,
  VEICULO: 3,
  PLACA: 4,
  DATA_OCORRENCIA: 5,
  OFICINA: 6,
  VALOR_PECAS: 7,
  VALOR_SERVICOS: 8,
  VALOR_FRANQUIA: 9,
  VALOR_OUTROS: 10,
  VALOR_TOTAL: 11,
  STATUS: 12,
  CAUSADOR: 13,
  JURIDICO_STATUS: 14,
  JURIDICO_VALOR: 15,
  CATEGORIA: 16,
  OBSERVACOES: 17,
};

// ============================================================
// AUTH — sessão real via Supabase Auth + fallback offline explícito
// ============================================================
const sbAuthClient = (window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;
let _authToken = SUPABASE_ANON;
let _offlineMode = false;

function getHeaders() {
  return {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${_authToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

// ============================================================
// CLIENTE HTTP LEVE (usa fetch direto na API REST)
// ============================================================
const sb = {
  async query(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: getHeaders(),
      ...opts,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase error ${res.status}: ${err}`);
    }
    return res.json().catch(() => []);
  },
  async select(table, params = '') {
    return this.query(`${table}?${params}`);
  },
  async insert(table, rows) {
    return this.query(table, {
      method: 'POST',
      headers: { ...getHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify(rows),
    });
  },
  async update(table, id, data) {
    return this.query(`${table}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async delete(table, id) {
    return this.query(`${table}?id=eq.${id}`, { method: 'DELETE' });
  },
  async upsert(table, rows) {
    return this.query(table, {
      method: 'POST',
      headers: { ...getHeaders(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(rows),
    });
  },
};

function applySession(session) {
  _authToken = session?.access_token || SUPABASE_ANON;
  window._authToken = _authToken;
  window._sbSession = session || null;
}

async function supabaseLogin(email, password) {
  if (!sbAuthClient) return { ok: false, error: 'SDK Supabase indisponível.' };
  const { data, error } = await sbAuthClient.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  applySession(data.session || null);
  _offlineMode = false;
  localStorage.removeItem('epm_offline_mode');
  return { ok: true, user: data.user || null };
}

async function supabaseLoginWithPIN() {
  return {
    ok: false,
    error: 'Login por PIN desativado. Use e-mail e senha ou modo offline explícito.'
  };
}

async function supabaseLogout() {
  try {
    if (sbAuthClient) await sbAuthClient.auth.signOut();
  } catch (_) {}
  applySession(null);
  _offlineMode = false;
  localStorage.removeItem('epm_offline_mode');
  console.log('🔒 Sessão encerrada');
}

function supabaseIsLoggedIn() {
  return !!(window._sbSession && window._sbSession.access_token);
}

function supabaseCurrentUser() {
  return window._sbSession?.user || null;
}

function supabaseIsOfflineMode() {
  return _offlineMode === true;
}

function supabaseCanSyncCloud() {
  return supabaseIsLoggedIn() && !_offlineMode;
}

function startOfflineMode() {
  _offlineMode = true;
  applySession(null);
  localStorage.setItem('epm_offline_mode', '1');
}

// ============================================================
// CONVERSOR: linha do Handsontable → objeto SQL
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
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
      const [d, m, y] = v.split('/');
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  return {
    filial: str(row[COL.FILIAL]),
    tipo_parte: str(row[COL.TIPO_PARTE]),
    tipo_sinistro: str(row[COL.TIPO_SINISTRO]),
    veiculo: str(row[COL.VEICULO]),
    placa: str(row[COL.PLACA]),
    data_ocorrencia: date(row[COL.DATA_OCORRENCIA]),
    oficina: strRaw(row[COL.OFICINA]),
    valor_pecas: num(row[COL.VALOR_PECAS]),
    valor_servicos: num(row[COL.VALOR_SERVICOS]),
    valor_franquia: num(row[COL.VALOR_FRANQUIA]),
    valor_outros: strRaw(row[COL.VALOR_OUTROS]),
    valor_total: num(row[COL.VALOR_TOTAL]),
    status: str(row[COL.STATUS]),
    causador: str(row[COL.CAUSADOR]),
    juridico_status: str(row[COL.JURIDICO_STATUS]),
    juridico_valor: num(row[COL.JURIDICO_VALOR]),
    categoria: str(row[COL.CATEGORIA]),
    observacoes: strRaw(row[COL.OBSERVACOES]),
    mes_referencia: mes,
    ano_referencia: ano,
  };
}

// ============================================================
// CONVERSOR INVERSO: objeto SQL → linha do Handsontable
// ============================================================
function eventoToRow(e) {
  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  return [
    e.filial || '',
    e.tipo_parte || '',
    e.tipo_sinistro || '',
    e.veiculo || '',
    e.placa || '',
    fmtDate(e.data_ocorrencia),
    e.oficina || '',
    e.valor_pecas ?? '',
    e.valor_servicos ?? '',
    e.valor_franquia ?? '',
    e.valor_outros || '',
    e.valor_total ?? 0,
    e.status || '',
    e.causador || '',
    e.juridico_status || '',
    e.juridico_valor ?? '',
    e.categoria || '',
    e.observacoes || '',
    e.id,
  ];
}

// ============================================================
// API PÚBLICA — CRUD de eventos
// ============================================================
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

async function logAuditRows(rows) {
  if (!rows || rows.length === 0 || !supabaseCanSyncCloud()) return;
  try {
    await sb.insert('eventos_audit', rows);
  } catch (e) {
    console.warn('⚠️ eventos_audit indisponível:', e.message);
  }
}

function buildFieldDiffs(before, after) {
  const keys = Object.keys(after);
  const diffs = [];
  keys.forEach((key) => {
    const oldValue = before?.[key] ?? null;
    const newValue = after?.[key] ?? null;
    if (String(oldValue ?? '') !== String(newValue ?? '')) {
      diffs.push({ field_name: key, old_value: oldValue, new_value: newValue });
    }
  });
  return diffs;
}

async function supabaseSaveMonth(mes, ano, rows) {
  try {
    if (!supabaseCanSyncCloud()) {
      return { ok: false, error: 'Sincronização em nuvem indisponível (offline ou sem login).' };
    }

    const existentes = await sb.select(
      'eventos',
      `mes_referencia=eq.${mes}&ano_referencia=eq.${ano}&select=*&order=id.asc&limit=1000`
    );
    const existentesPorId = new Map(existentes.map((e) => [Number(e.id), e]));
    const idsPresentes = new Set();
    const auditRows = [];
    const user = supabaseCurrentUser();
    const userLabel = user?.email || user?.id || 'desconhecido';

    let created = 0;
    let updated = 0;

    const linhasValidas = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row && row[COL.FILIAL] && String(row[COL.FILIAL]).trim() !== '');

    for (const { row } of linhasValidas) {
      const payload = rowToEvento(row, mes, ano);
      const rowId = Number(row[18]);

      if (Number.isFinite(rowId) && existentesPorId.has(rowId)) {
        const before = existentesPorId.get(rowId);
        await sb.update('eventos', rowId, payload);
        const diffs = buildFieldDiffs(before, payload);
        diffs.forEach((d) => {
          auditRows.push({
            evento_id: rowId,
            action: 'UPDATE',
            field_name: d.field_name,
            old_value: d.old_value === null ? null : String(d.old_value),
            new_value: d.new_value === null ? null : String(d.new_value),
            user_email: userLabel,
            changed_at: new Date().toISOString(),
            mes_referencia: mes,
            ano_referencia: ano
          });
        });
        idsPresentes.add(rowId);
        updated++;
      } else {
        const inserted = await sb.insert('eventos', [payload]);
        const newId = inserted?.[0]?.id;
        if (newId !== undefined && newId !== null) {
          row[18] = Number(newId);
          idsPresentes.add(Number(newId));
          auditRows.push({
            evento_id: Number(newId),
            action: 'CREATE',
            field_name: '*',
            old_value: null,
            new_value: JSON.stringify(payload),
            user_email: userLabel,
            changed_at: new Date().toISOString(),
            mes_referencia: mes,
            ano_referencia: ano
          });
        }
        created++;
      }
    }

    let deleted = 0;
    for (const existente of existentes) {
      const id = Number(existente.id);
      if (!idsPresentes.has(id)) {
        auditRows.push({
          evento_id: id,
          action: 'DELETE',
          field_name: '*',
          old_value: JSON.stringify(existente),
          new_value: null,
          user_email: userLabel,
          changed_at: new Date().toISOString(),
          mes_referencia: mes,
          ano_referencia: ano
        });
        await sb.delete('eventos', id);
        deleted++;
      }
    }

    await logAuditRows(auditRows);

    console.log(`✅ Supabase: ${created} criados, ${updated} atualizados, ${deleted} removidos (${mes}/${ano})`);
    return { ok: true, count: linhasValidas.length, created, updated, deleted };
  } catch (e) {
    console.error('❌ supabaseSaveMonth:', e);
    return { ok: false, error: e.message };
  }
}

// ============================================================
// LISTA MESES DISPONÍVEIS — usa RPC distinct para performance
// ============================================================
async function supabaseListMonths() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/eventos?select=mes_referencia,ano_referencia&order=ano_referencia.desc,mes_referencia.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${_authToken}`,
          'Prefer': 'count=none',
          'Range': '0-999',
        }
      }
    );
    const rows = await res.json();
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

async function supabaseDeleteRow(id) {
  try {
    const existing = await sb.select('eventos', `id=eq.${id}&limit=1`);
    await sb.delete('eventos', id);
    const user = supabaseCurrentUser();
    await logAuditRows([{
      evento_id: Number(id),
      action: 'DELETE',
      field_name: '*',
      old_value: existing?.[0] ? JSON.stringify(existing[0]) : null,
      new_value: null,
      user_email: user?.email || user?.id || 'desconhecido',
      changed_at: new Date().toISOString(),
      mes_referencia: existing?.[0]?.mes_referencia || null,
      ano_referencia: existing?.[0]?.ano_referencia || null
    }]);
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

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

// ============================================================
// DOWNLOAD CSV — baixa eventos do mês/ano atual
// ============================================================
async function supabaseDownloadCSV(mes, ano) {
  try {
    const rows = await sb.select(
      'eventos',
      `mes_referencia=eq.${mes}&ano_referencia=eq.${ano}&order=id.asc&limit=1000`
    );

    if (!rows || rows.length === 0) {
      alert('Nenhum dado encontrado para exportar.');
      return;
    }

    const colunas = [
      'filial','tipo_parte','tipo_sinistro','veiculo','placa',
      'data_ocorrencia','oficina','valor_franquia','valor_servicos',
      'valor_pecas','valor_outros','valor_total','status',
      'causador','juridico_status','juridico_valor','categoria','observacoes'
    ];

    const cabecalho = colunas.join(';');
    const linhas = rows.map(row =>
      colunas.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(';')
    );

    const csvContent = '\uFEFF' + [cabecalho, ...linhas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventos_porto_${String(mes).padStart(2,'0')}_${ano}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`✅ CSV exportado: ${rows.length} registros`);
  } catch (e) {
    console.error('❌ supabaseDownloadCSV:', e);
    alert('Erro ao exportar: ' + e.message);
  }
}

function removeAuthOverlay() {
  const el = document.getElementById('sb-auth-overlay');
  if (el) el.remove();
}

function showAuthOverlay() {
  if (document.getElementById('sb-auth-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'sb-auth-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(2,6,23,.85);display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:min(460px,100%);padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.35);">
      <h2 style="margin:0 0 10px;font-weight:800;color:#0f172a;">Acesso Porto Mais</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">Entre com usuário/senha Supabase. Offline é permitido apenas como fallback local.</p>
      <form id="sb-auth-form">
        <input id="sb-auth-email" type="email" autocomplete="username" placeholder="E-mail" style="width:100%;margin-bottom:8px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;" required />
        <input id="sb-auth-pass" type="password" autocomplete="current-password" placeholder="Senha" style="width:100%;margin-bottom:12px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;" required />
        <div id="sb-auth-msg" style="font-size:12px;color:#b91c1c;min-height:18px;margin-bottom:8px;"></div>
        <button type="submit" style="width:100%;padding:10px;border:none;border-radius:8px;background:#0f766e;color:#fff;font-weight:700;cursor:pointer;">Entrar</button>
      </form>
      <button id="sb-auth-offline" style="width:100%;margin-top:8px;padding:10px;border:1px solid #94a3b8;border-radius:8px;background:#f8fafc;color:#0f172a;font-weight:600;cursor:pointer;">Continuar em modo offline (local)</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#sb-auth-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = overlay.querySelector('#sb-auth-email')?.value?.trim();
    const password = overlay.querySelector('#sb-auth-pass')?.value || '';
    const msg = overlay.querySelector('#sb-auth-msg');
    msg.textContent = 'Validando...';
    const result = await supabaseLogin(email, password);
    if (!result.ok) {
      msg.textContent = result.error || 'Falha no login.';
      return;
    }
    msg.textContent = '';
    removeAuthOverlay();
  });

  overlay.querySelector('#sb-auth-offline')?.addEventListener('click', () => {
    startOfflineMode();
    removeAuthOverlay();
  });
}

async function initializeAuthGate() {
  if (localStorage.getItem('epm_offline_mode') === '1') {
    _offlineMode = true;
    return;
  }
  if (!sbAuthClient) {
    showAuthOverlay();
    return;
  }
  const { data } = await sbAuthClient.auth.getSession();
  applySession(data?.session || null);
  if (!data?.session) showAuthOverlay();
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAuthGate().catch((err) => {
    console.error('Falha ao inicializar autenticação:', err);
    showAuthOverlay();
  });
});

// ============================================================
// API pública exposta globalmente (compatível com app.js)
// ============================================================
window.supabaseLoadMonth = supabaseLoadMonth;
window.supabaseSaveMonth = supabaseSaveMonth;
window.supabaseListMonths = supabaseListMonths;
window.supabaseDeleteRow = supabaseDeleteRow;
window.supabaseSearch = supabaseSearch;
window.supabaseLogin = supabaseLogin;
window.supabaseLoginWithPIN = supabaseLoginWithPIN;
window.supabaseLogout = supabaseLogout;
window.supabaseIsLoggedIn = supabaseIsLoggedIn;
window.supabaseCurrentUser = supabaseCurrentUser;
window.supabaseIsOfflineMode = supabaseIsOfflineMode;
window.supabaseCanSyncCloud = supabaseCanSyncCloud;
window.supabaseDownloadCSV = supabaseDownloadCSV;
