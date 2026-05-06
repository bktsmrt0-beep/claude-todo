const SUPABASE_URL = 'https://qjzrcpcczhtnkhwgrdih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenJjcGNjemh0bmtod2dyZGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTc0MDYsImV4cCI6MjA5MzYzMzQwNn0.au376LMf4euPv7LCbZ1OAgAnilSw2D6TI-37OCkpkQk';
const AUTH = `${SUPABASE_URL}/auth/v1`;
const AUTH_HEADERS = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY };

let currentSession = null;
let pendingEmail = '';

function getSession() {
  const raw = localStorage.getItem('sb_session');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveSession(session) {
  currentSession = session;
  localStorage.setItem('sb_session', JSON.stringify(session));
}

function clearSession() {
  currentSession = null;
  localStorage.removeItem('sb_session');
}

function showMsg(elId, msg, isError = true) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.style.color = isError ? '#e53e3e' : '#38a169';
}

function showForm(name) {
  ['loginForm', 'registerForm', 'otpForm'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(name).classList.remove('hidden');
}

async function register(email, password) {
  const res = await fetch(`${AUTH}/signup`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function verifyOtp(email, token, type = 'signup') {
  const res = await fetch(`${AUTH}/verify`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, token, type })
  });
  return res.json();
}

async function login(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function logout() {
  const session = getSession();
  if (session?.access_token) {
    await fetch(`${AUTH}/logout`, {
      method: 'POST',
      headers: { ...AUTH_HEADERS, 'Authorization': `Bearer ${session.access_token}` }
    });
  }
  clearSession();
  location.reload();
}

function initAuth() {
  const session = getSession();
  if (session?.access_token) {
    showApp(session);
    return;
  }
  document.getElementById('authScreen').classList.remove('hidden');

  // Sekme geçişi
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showForm(btn.dataset.tab === 'login' ? 'loginForm' : 'registerForm');
    });
  });

  // Kayıt
  document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    showMsg('registerMsg', 'Kaydediliyor...', false);
    const data = await register(email, password);
    if (data.id || data.user) {
      pendingEmail = email;
      document.getElementById('otpInfo').textContent = `${email} adresine 6 haneli doğrulama kodu gönderildi.`;
      showForm('otpForm');
      showMsg('otpMsg', '');
    } else {
      showMsg('registerMsg', data.msg || data.message || data.error_description || 'Hata oluştu.');
    }
  });

  // OTP Doğrulama
  document.getElementById('otpForm').addEventListener('submit', async e => {
    e.preventDefault();
    const token = document.getElementById('otpInput').value.trim();
    showMsg('otpMsg', 'Doğrulanıyor...', false);
    const data = await verifyOtp(pendingEmail, token, 'signup');
    if (data.access_token) {
      saveSession(data);
      showApp(data);
    } else {
      showMsg('otpMsg', data.msg || data.message || data.error_description || 'Geçersiz kod.');
    }
  });

  // Kodu tekrar gönder
  document.getElementById('resendBtn').addEventListener('click', async () => {
    if (!pendingEmail) return;
    showMsg('otpMsg', 'Kod tekrar gönderildi.', false);
    await fetch(`${AUTH}/resend`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ email: pendingEmail, type: 'signup' })
    });
  });

  // Giriş
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    showMsg('loginMsg', 'Giriş yapılıyor...', false);
    const data = await login(email, password);
    if (data.access_token) {
      saveSession(data);
      showApp(data);
    } else {
      const msg = data.msg || data.message || data.error_description || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        pendingEmail = email;
        document.getElementById('otpInfo').textContent = `${email} adresine doğrulama kodu gönderildi.`;
        showForm('otpForm');
      } else {
        showMsg('loginMsg', msg || 'E-posta veya şifre hatalı.');
      }
    }
  });
}

function showApp(session) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('userEmail').textContent = session.user?.email || '';
  document.getElementById('logoutBtn').addEventListener('click', logout);
}
