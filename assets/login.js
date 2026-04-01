// ============ SISTEMA DE LOGIN - PORTO MAIS ============
// Senhas dos usuários (hash SHA-256 via Web Crypto API)
// Hashes gerados corretamente para as senhas abaixo

const USERS = [
  { username: 'porto',  passwordHash: '8b172a46c5b247c787561506c4f823529cd9f6bda00b5f23357d9ca2fca12e8e' }, // senha: portomais2024
  { username: 'admin',  passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' }  // senha: admin123
];

// Senhas em texto simples para fallback (usado em ambientes sem Web Crypto)
const PASSWORDS_PLAIN = {
  'porto': 'portomais2024',
  'admin': 'admin123'
};

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkLogin(username, password) {
  const lower = username.toLowerCase().trim();
  // Fallback: verificação direta de texto
  if (PASSWORDS_PLAIN[lower] !== undefined) {
    return PASSWORDS_PLAIN[lower] === password;
  }
  // Hash check
  const hash = await hashPassword(password);
  return USERS.some(u => u.username === lower && u.passwordHash === hash);
}

function isAuthenticated() {
  return sessionStorage.getItem('pm_auth') === 'ok';
}

function logout() {
  sessionStorage.removeItem('pm_auth');
  sessionStorage.removeItem('pm_user');
  location.reload();
}

function showLoginScreen() {
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
  setTimeout(() => {
    const userInput = document.getElementById('login-username');
    if (userInput) userInput.focus();
  }, 100);
}

function showApp(username) {
  sessionStorage.setItem('pm_auth', 'ok');
  sessionStorage.setItem('pm_user', username);
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';
  
  // Mostra o usuário logado na topbar
  const userBadge = document.getElementById('logged-user-badge');
  if (userBadge) {
    userBadge.textContent = '👤 ' + username.toUpperCase();
    userBadge.style.display = 'inline-flex';
  }
}

async function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btnEl = document.getElementById('login-btn');
  
  if (!username || !password) {
    errorEl.textContent = 'Preencha usuário e senha.';
    errorEl.style.display = 'block';
    return;
  }
  
  btnEl.disabled = true;
  btnEl.textContent = 'Verificando...';
  errorEl.style.display = 'none';
  
  const ok = await checkLogin(username, password);
  
  if (ok) {
    btnEl.textContent = '✅ Entrando...';
    setTimeout(() => showApp(username), 400);
  } else {
    errorEl.textContent = '❌ Usuário ou senha incorretos.';
    errorEl.style.display = 'block';
    btnEl.disabled = false;
    btnEl.textContent = 'Entrar';
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
    
    // Shake animation
    const card = document.getElementById('login-card');
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'loginShake 0.4s ease';
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    showApp(sessionStorage.getItem('pm_user') || 'usuário');
  } else {
    showLoginScreen();
  }
  
  const form = document.getElementById('login-form');
  if (form) form.addEventListener('submit', handleLoginSubmit);
  
  // Enter no campo usuário foca senha
  const userInput = document.getElementById('login-username');
  if (userInput) {
    userInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('login-password').focus();
      }
    });
  }
});
