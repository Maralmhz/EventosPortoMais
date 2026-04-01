// ============================================================
// SUPABASE CONFIG — EventosPortoMais
// Autenticação via PIN + CRUD de eventos
// ============================================================
const SUPABASE_URL = 'https://xjgyijfogxefmvfnwwbh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZ3lpamZvZ3hlZm12Zm53d2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTM3NTYsImV4cCI6MjA5MDYyOTc1Nn0.WCEUnEkswLZXow8xwMBscYdBRZxK1BkW7skI-WS2rFQ';

// ============================================================
// MÊS PADRÃO = MÊS ANTERIOR (Abril → exibe Março)
// ============================================================
const _hoje = new Date();
const MES_PADRAO = _hoje.getMonth() === 0 ? 12 : _hoje.getMonth(); // getMonth() retorna 0-11
const ANO_PADRAO = _hoje.getMonth() === 0 ? _hoje.getFullYear() - 1 : _hoje.getFullYear();

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
// AUTH — token dinâmico (atualizado após login)
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

// ============================================================
// AUTENTICAÇÃO — Login via PIN
// ============================================================
const CORRECT_PIN = '101010';
const PIN_EMAIL = 'eventos@portomais.net.br';
const PIN_PASSWORD = '101010';

async function supabaseLoginWithPIN(pin) {
  if (pin !== CORRECT_PIN) {
    return { ok: false, error: 'PIN incorreto' };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: PIN_EMAIL, password: PIN_PASSWORD }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error_description || data.msg || 'Erro de autenticação' };
    }
    _authToken = data.access_token;
    window._sbSession = data;
    console.log('✅ Login realizado:', data.user?.email);
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

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

function supabaseIsLoggedIn() {
  return !!(window._sbSession && window._sbSession.access_token);
}

function supabaseCurrentUser() {
  return window._sbSession?.user || null;
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
    // Formato DD/MM/YYYY
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
// TELA DE LOGIN COM PIN (teclado numérico estilo caixa eletrônico)
// ============================================================
function supabaseInjectPINScreen() {
  if (document.getElementById('sb-pin-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'sb-pin-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    background:linear-gradient(135deg,#002B5C 0%,#001b3a 60%,#003366 100%);
    display:flex; align-items:center; justify-content:center;
    font-family:'Segoe UI',sans-serif;
  `;
  overlay.innerHTML = `
    <div style="background:#fff; padding:2.5rem; border-radius:1.5rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); width:100%; max-width:400px; text-align:center; animation:fadeIn 0.5s ease-out;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">P+</div>
      <h2 style="margin:0; color:#002B5C; font-weight:800; letter-spacing:-0.5px;">Porto Mais</h2>
      <p style="color:#64748b; margin-bottom:2rem; font-size:0.9rem;">Gestão de Eventos</p>
      
      <div style="margin-bottom:2rem;">
        <div style="display:flex; justify-content:center; gap:0.75rem; margin-bottom:1rem;">
          <div class="pin-dot" style="width:14px; height:14px; border-radius:50%; background:#e2e8f0; transition:all 0.2s;"></div>
          <div class="pin-dot" style="width:14px; height:14px; border-radius:50%; background:#e2e8f0; transition:all 0.2s;"></div>
          <div class="pin-dot" style="width:14px; height:14px; border-radius:50%; background:#e2e8f0; transition:all 0.2s;"></div>
          <div class="pin-dot" style="width:14px; height:14px; border-radius:50%; background:#e2e8f0; transition:all 0.2s;"></div>
          <div class="pin-dot" style="width:14px; height:14px; border-radius:50%; background:#e2e8f0; transition:all 0.2s;"></div>
          <div class="pin-dot" style="width:14px; height:14px; border-radius:50%; background:#e2e8f0; transition:all 0.2s;"></div>
        </div>
        <p id="pin-error" style="color:#ef4444; font-size:0.85rem; height:1rem; display:none;"></p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:2rem;">
        ${[1,2,3,4,5,6,7,8,9].map(n => `
          <button onclick="addPinDigit('${n}')" style="aspect-ratio:1; border-radius:1rem; border:1px solid #e2e8f0; background:#f8fafc; color:#002B5C; font-size:1.5rem; font-weight:600; cursor:pointer; transition:all 0.2s; outline:none;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">${n}</button>
        `).join('')}
        <button onclick="clearPin()" style="aspect-ratio:1; border-radius:1rem; border:1px solid #e2e8f0; background:#fff1f2; color:#be123c; font-size:0.85rem; font-weight:600; cursor:pointer; outline:none;">Limpar</button>
        <button onclick="addPinDigit('0')" style="aspect-ratio:1; border-radius:1rem; border:1px solid #e2e8f0; background:#f8fafc; color:#002B5C; font-size:1.5rem; font-weight:600; cursor:pointer; outline:none;">0</button>
        <button onclick="removePinDigit()" style="aspect-ratio:1; border-radius:1rem; border:1px solid #e2e8f0; background:#f8fafc; color:#002B5C; font-size:1.5rem; font-weight:600; cursor:pointer; outline:none;">←</button>
      </div>

      <button id="pin-submit" onclick="submitPin()" disabled style="width:100%; padding:1rem; border-radius:1rem; border:none; background:linear-gradient(135deg,#cbd5e1,#94a3b8); color:#fff; font-size:1.1rem; font-weight:700; cursor:not-allowed; transition:all 0.3s; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">🔐 Entrar</button>
      
      <div style="margin-top:2rem; font-size:0.75rem; color:#94a3b8; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
        <span>🔒 Acesso protegido • Porto Mais © 2026</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let pinValue = '';
  const dots = overlay.querySelectorAll('.pin-dot');
  const errorEl = overlay.querySelector('#pin-error');
  const submitBtn = overlay.querySelector('#pin-submit');

  window.addPinDigit = (digit) => {
    if (pinValue.length < 6) {
      pinValue += digit;
      dots[pinValue.length - 1].style.background = 'linear-gradient(135deg,#002B5C,#0057b8)';
      errorEl.style.display = 'none';
      if (pinValue.length === 6) {
        submitBtn.disabled = false;
        submitBtn.style.background = 'linear-gradient(135deg,#002B5C,#0057b8)';
        submitBtn.style.cursor = 'pointer';
      }
    }
  };

  window.removePinDigit = () => {
    if (pinValue.length > 0) {
      dots[pinValue.length - 1].style.background = '#e2e8f0';
      pinValue = pinValue.slice(0, -1);
      submitBtn.disabled = true;
      submitBtn.style.background = 'linear-gradient(135deg,#cbd5e1,#94a3b8)';
      submitBtn.style.cursor = 'not-allowed';
    }
  };

  window.clearPin = () => {
    pinValue = '';
    dots.forEach(d => d.style.background = '#e2e8f0');
    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.style.background = 'linear-gradient(135deg,#cbd5e1,#94a3b8)';
    submitBtn.style.cursor = 'not-allowed';
  };

  window.submitPin = async () => {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Verificando...';
    
    const result = await supabaseLoginWithPIN(pinValue);
    if (result.ok) {
      overlay.style.transition = 'opacity .4s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 400);
      
      if (typeof window.loadMonthData === 'function') {
        window.loadMonthData(MES_PADRAO, ANO_PADRAO);
        sessionStorage.setItem('userRole', 'ADMIN');
      }
      console.log(`✅ Bem-vindo! Carregando ${MES_PADRAO}/${ANO_PADRAO}`);
    } else {
      errorEl.textContent = '❌ ' + (result.error || 'PIN incorreto');
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '🔐 Entrar';
      window.clearPin();
    }
  };
}

// Inicialização automática
window.addEventListener('DOMContentLoaded', () => {
  supabaseInjectPINScreen();
});

// Expõe no escopo global
window.supabaseLoginWithPIN = supabaseLoginWithPIN;
window.supabaseLogout = supabaseLogout;
window.supabaseIsLoggedIn = supabaseIsLoggedIn;
window.supabaseCurrentUser = supabaseCurrentUser;
window.supabaseLoadMonth = supabaseLoadMonth;
window.supabaseSaveMonth = supabaseSaveMonth;
window.supabaseListMonths = supabaseListMonths;
window.supabaseDeleteRow = supabaseDeleteRow;
window.supabaseSearch = supabaseSearch;
window.MES_PADRAO = MES_PADRAO;
window.ANO_PADRAO = ANO_PADRAO;
window.COL = COL;
window.rowToEvento = rowToEvento;
window.eventoToRow = eventoToRow;

console.log(`✅ Supabase PIN login carregado — mês padrão: ${MES_PADRAO}/${ANO_PADRAO}`);

// Adiciona CSS de animação
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
document.head.appendChild(style);
