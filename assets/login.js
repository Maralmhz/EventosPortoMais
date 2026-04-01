// ============ SISTEMA DE LOGIN - PORTO MAIS ============
// Verificação por texto simples (seguro para uso interno/intranet)

const USERS_PLAIN = {
  'porto':    'portomais2024',
  'admin':    'admin123',
  'maralmhz': 'portomais2024'
};

async function checkLogin(username, password) {
  const lower = username.toLowerCase().trim();
  if (USERS_PLAIN[lower] !== undefined) {
    return USERS_PLAIN[lower] === password;
  }
  return false;
}

function isAuthenticated() {
  return sessionStorage.getItem('pm_auth') === 'ok';
}

function logout() {
  sessionStorage.removeItem('pm_auth');
  sessionStorage.removeItem('pm_user');
  location.reload();
}

function confirmLogout() {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Sair do sistema?',
      text: 'Você será redirecionado para a tela de login.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, sair',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    }).then(result => { if (result.isConfirmed) logout(); });
  } else {
    if (confirm('Deseja sair?')) logout();
  }
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
  const btnEl   = document.getElementById('login-btn');

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

    const card = document.getElementById('login-card');
    card.style.animation = 'none';
    card.offsetHeight; // reflow
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
