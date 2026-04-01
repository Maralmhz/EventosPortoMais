// ============================================================
//  SUPABASE CONFIG — EventosPortoMais
//  Autenticação + CRUD de eventos
// ============================================================

const SUPABASE_URL  = 'https://xjgyijfogxefmvfnwwbh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZ3lpamZvZ3hlZm12Zm53d2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTM3NTYsImV4cCI6MjA5MDYyOTc1Nn0.WCEUnEkswLZXow8xwMBscYdBRZxK1BkW7skI-WS2rFQ';

// ============================================================
//  MÊS PADRÃO = MÊS ANTERIOR (Abril → exibe Março)
// ============================================================
const _hoje = new Date();
const MES_PADRAO = _hoje.getMonth() === 0 ? 12 : _hoje.getMonth(); // getMonth() retorna 0-11
const ANO_PADRAO = _hoje.getMonth() === 0 ? _hoje.getFullYear() - 1 : _hoje.getFullYear();

// ============================================================
//  MAPEAMENTO: índices do array Handsontable → colunas SQL
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
//  AUTH — token dinâmico (atualizado após login)
// ============================================================
let _authToken = SUPABASE_ANON;

function getHeaders() {
  return {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${_authToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

// ============================================================
//  CLIENTE HTTP LEVE (usa fetch direto na API REST)
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

// ============================================================
//  AUTENTICAÇÃO — Login / Logout / Sessão
// ============================================================

/** Faz login com email e senha */
async function supabaseLogin(email, password) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error_description || data.msg || 'Credenciais inválidas' };
    }

    // Salva token em memória (não localStorage por restrição do sandbox)
    _authToken = data.access_token;
    window._sbSession = data;

    console.log('✅ Login realizado:', data.user?.email);
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Faz logout */
async function supabaseLogout() {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${_authToken}`,
      },
    });
  } catch (_) {}
  _authToken = SUPABASE_ANON;
  window._sbSession = null;
  console.log('🔒 Sessão encerrada');
}

/** Verifica se há sessão ativa */
function supabaseIsLoggedIn() {
  return !!(window._sbSession && window._sbSession.access_token);
}

/** Retorna dados do usuário atual */
function supabaseCurrentUser() {
  return window._sbSession?.user || null;
}

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
    e.id,  // coluna oculta — ID do banco
  ];
}

// ============================================================
//  API PÚBLICA — CRUD de eventos
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

async function supabaseSaveMonth(mes, ano, rows) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/eventos?mes_referencia=eq.${mes}&ano_referencia=eq.${ano}`,
      { method: 'DELETE', headers: getHeaders() }
    );

    const validas = rows.filter(r => r && r[COL.FILIAL] && String(r[COL.FILIAL]).trim() !== '');
    if (validas.length === 0) return { ok: true, count: 0 };

    const objs = validas.map(r => rowToEvento(r, mes, ano));
    await sb.insert('eventos', objs);

    console.log(`✅ Supabase: ${objs.length} eventos salvos (${mes}/${ano})`);
    return { ok: true, count: objs.length };
  } catch (e) {
    console.error('❌ supabaseSaveMonth:', e);
    return { ok: false, error: e.message };
  }
}

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

async function supabaseDeleteRow(id) {
  try {
    await sb.delete('eventos', id);
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

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
//  TELA DE LOGIN — injeta HTML + lógica na página
// ============================================================
function supabaseInjectLoginScreen() {
  // Evita duplicar
  if (document.getElementById('sb-login-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'sb-login-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    background:linear-gradient(135deg,#002B5C 0%,#001b3a 60%,#003366 100%);
    display:flex; align-items:center; justify-content:center;
    font-family:'Segoe UI',sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:40px 36px;width:360px;box-shadow:0 24px 60px rgba(0,0,0,0.4);text-align:center;">
      <!-- Logo Porto Mais -->
      <div style="margin-bottom:20px;">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin:0 auto;">
          <rect width="56" height="56" rx="14" fill="#002B5C"/>
          <path d="M12 38 L28 14 L44 38 Z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="28" cy="28" r="5" fill="#3b82f6"/>
          <line x1="28" y1="38" x2="28" y2="44" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 style="font-size:22px;font-weight:900;color:#1e293b;margin-bottom:4px;">Porto Mais</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:28px;font-weight:600;">Gestão de Eventos</p>

      <div id="sb-login-error" style="display:none;background:#fee2e2;color:#dc2626;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:700;margin-bottom:16px;"></div>

      <div style="text-align:left;margin-bottom:14px;">
        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px;">E-MAIL</label>
        <input id="sb-email" type="email" value="eventos@portomais.net.br"
          style="width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;transition:border .2s;"
          onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e2e8f0'"
          placeholder="seu@email.com"/>
      </div>

      <div style="text-align:left;margin-bottom:24px;">
        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px;">SENHA</label>
        <div style="position:relative;">
          <input id="sb-password" type="password" value="101010"
            style="width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;transition:border .2s;"
            onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e2e8f0'"
            placeholder="••••••"
            onkeydown="if(event.key==='Enter') document.getElementById('sb-login-btn').click()"/>
          <button onclick="const i=document.getElementById('sb-password');i.type=i.type==='password'?'text':'password';"
            style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;">👁</button>
        </div>
      </div>

      <button id="sb-login-btn"
        style="width:100%;padding:14px;background:linear-gradient(135deg,#002B5C 0%,#1d4ed8 100%);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;transition:all .2s;box-shadow:0 4px 16px rgba(0,43,92,0.35);"
        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,43,92,0.4)'"
        onmouseout="this.style.transform='';this.style.boxShadow='0 4px 16px rgba(0,43,92,0.35)'"
        onclick="sbDoLogin()">
        🔐 Entrar
      </button>

      <p style="font-size:11px;color:#cbd5e1;margin-top:20px;">Porto Mais Seguros © 2026</p>
    </div>
  `;

  document.body.appendChild(overlay);
}

async function sbDoLogin() {
  const btn = document.getElementById('sb-login-btn');
  const errEl = document.getElementById('sb-login-error');
  const email = document.getElementById('sb-email').value.trim();
  const pass  = document.getElementById('sb-password').value;

  btn.disabled = true;
  btn.innerHTML = '⏳ Entrando...';
  errEl.style.display = 'none';

  const result = await supabaseLogin(email, pass);

  if (result.ok) {
    const overlay = document.getElementById('sb-login-overlay');
    overlay.style.transition = 'opacity .4s';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 400);

    // Atualiza badge de usuário se existir
    const badge = document.getElementById('badge-month');
    if (badge) badge.title = result.user?.email || '';

    // Recarrega dados do mês padrão (mês anterior)
    if (typeof window.loadMonthData === 'function') {
      window.loadMonthData(MES_PADRAO, ANO_PADRAO);
    }
    console.log(`✅ Bem-vindo! Carregando ${MES_PADRAO}/${ANO_PADRAO}`);
  } else {
    errEl.textContent = '❌ ' + (result.error || 'E-mail ou senha incorretos');
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '🔐 Entrar';
  }
}

// ============================================================
//  INICIALIZAÇÃO AUTOMÁTICA — exibe login ao carregar a página
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  supabaseInjectLoginScreen();
});

// ============================================================
//  EXPÕE NO ESCOPO GLOBAL
// ============================================================
window.supabaseLogin         = supabaseLogin;
window.supabaseLogout        = supabaseLogout;
window.supabaseIsLoggedIn    = supabaseIsLoggedIn;
window.supabaseCurrentUser   = supabaseCurrentUser;
window.supabaseLoadMonth     = supabaseLoadMonth;
window.supabaseSaveMonth     = supabaseSaveMonth;
window.supabaseListMonths    = supabaseListMonths;
window.supabaseDeleteRow     = supabaseDeleteRow;
window.supabaseSearch        = supabaseSearch;
window.supabaseSearchByPlaca = supabaseSearchByPlaca;
window.sbDoLogin             = sbDoLogin;
window.MES_PADRAO            = MES_PADRAO;
window.ANO_PADRAO            = ANO_PADRAO;
window.COL                   = COL;
window.rowToEvento           = rowToEvento;
window.eventoToRow           = eventoToRow;

console.log(`✅ Supabase config carregado — mês padrão: ${MES_PADRAO}/${ANO_PADRAO}`);
