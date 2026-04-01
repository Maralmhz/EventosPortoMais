// ========================================
// SISTEMA DE LOGIN PIN - EventosPortoMais
// PIN 101010 = Admin (acesso total)
// PIN 202020 = Visualização (somente leitura)
// ========================================

const PIN_CONFIG = {
  ADMIN: '101010',
  VIEW_ONLY: '202020'
};

// Verifica se já está autenticado
function checkAuth() {
  const userRole = sessionStorage.getItem('userRole');
  if (userRole) {
    showApp(userRole);
    return true;
  }
  return false;
}

// Mostra tela de login
function showLoginScreen() {
  const loginHTML = `
    <div id="pin-login-overlay" style="
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #001b3a 0%, #002B5C 50%, #003d7a 100%);
      font-family: 'Segoe UI', Tahoma, sans-serif;
    ">
      <div style="
        background: white;
        border-radius: 24px;
        padding: 48px 40px;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 32px 80px rgba(0,0,0,0.4);
        text-align: center;
      ">
        <div style="
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #002B5C 0%, #0057b8 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          margin: 0 auto 24px;
          box-shadow: 0 8px 24px rgba(0,43,92,0.35);
        ">🔒</div>
        
        <h1 style="
          font-size: 24px;
          font-weight: 900;
          color: #1e293b;
          margin-bottom: 8px;
        ">Porto Mais</h1>
        
        <p style="
          font-size: 14px;
          color: #64748b;
          margin-bottom: 32px;
          font-weight: 500;
        ">Gerenciador de Eventos — Acesso Restrito</p>
        
        <label style="
          display: block;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          margin-bottom: 8px;
          text-align: left;
        ">Código PIN</label>
        
        <input 
          type="password" 
          id="pin-input"
          inputmode="numeric"
          maxlength="6"
          placeholder="Digite seu PIN"
          style="
            width: 100%;
            padding: 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            letter-spacing: 8px;
            color: #1e293b;
            background: #f8fafc;
            outline: none;
            margin-bottom: 8px;
            box-sizing: border-box;
          "
          autofocus
        />
        
        <div id="pin-error" style="
          display: none;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
          font-weight: 600;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        "></div>
        
        <button id="pin-submit" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #002B5C 0%, #0057b8 100%);
          color: white;
          font-size: 16px;
          font-weight: 800;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,43,92,0.35);
          transition: all 0.2s ease;
          margin-top: 8px;
        ">Entrar</button>
        
        <p style="
          margin-top: 24px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        ">🔒 Acesso protegido • Porto Mais © 2026</p>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', loginHTML);
  
  const input = document.getElementById('pin-input');
  const submit = document.getElementById('pin-submit');
  const errorDiv = document.getElementById('pin-error');
  
  function attemptLogin() {
    const pin = input.value.trim();
    
    if (!pin) {
      showError('Digite seu PIN');
      return;
    }
    
    if (pin === PIN_CONFIG.ADMIN) {
      sessionStorage.setItem('userRole', 'admin');
      hideLoginScreen();
      showApp('admin');
    } else if (pin === PIN_CONFIG.VIEW_ONLY) {
      sessionStorage.setItem('userRole', 'view_only');
      hideLoginScreen();
      showApp('view_only');
    } else {
      showError('PIN incorreto!');
      input.value = '';
      input.focus();
      // Animação de erro
      input.style.animation = 'shake 0.5s';
      setTimeout(() => input.style.animation = '', 500);
    }
  }
  
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
  
  submit.addEventListener('click', attemptLogin);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
  
  // Apenas números
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
    if (errorDiv.style.display === 'block') {
      errorDiv.style.display = 'none';
    }
  });
}

function hideLoginScreen() {
  const overlay = document.getElementById('pin-login-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => overlay.remove(), 300);
  }
}

function showApp(role) {
  document.body.style.opacity = '0';
  
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity = '1';
  }, 100);
  
  // Configura modo de visualização se for view_only
  if (role === 'view_only') {
    setViewOnlyMode();
  }
  
  console.log(`🔒 Usuário autenticado como: ${role === 'admin' ? 'Administrador' : 'Visualização'}`);
}

function setViewOnlyMode() {
  // Desabilita botões de ação
  setTimeout(() => {
    const buttonsToDisable = [
      '#btn-salvar',
      '#btn-adicionar-evento',
      '.btn-editar',
      '.btn-excluir',
      'button[onclick*="save"]',
      'button[onclick*="add"]',
      'button[onclick*="delete"]'
    ];
    
    buttonsToDisable.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.title = 'Acesso somente leitura';
      });
    });
    
    // Adiciona badge de visualização
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 4px 12px rgba(245,158,11,0.3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      badge.textContent = '👁️ Visualização';
      topbar.appendChild(badge);
    }
  }, 500);
}

// Função de logout
function logout() {
  sessionStorage.removeItem('userRole');
  location.reload();
}

// Adiciona CSS de animação
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-8px); }
    80% { transform: translateX(8px); }
  }
`;
document.head.appendChild(style);

// Inicializa ao carregar
if (!checkAuth()) {
  showLoginScreen();
}

// Exporta funções para uso global
window.logout = logout;
window.getUserRole = () => sessionStorage.getItem('userRole');
window.isAdmin = () => sessionStorage.getItem('userRole') === 'admin';
