// Shared configuration and helpers. Loaded first on every page.

// When the page is served by the TaskFlow server (http://localhost:5000) we use the same origin.
// If you open the HTML with VS Code Live Server (or as a file), we talk to the API on port 5000.
const SERVER_ORIGIN =
  location.protocol === 'file:' || ['5500', '5501', '3000'].includes(location.port)
    ? 'http://localhost:5000'
    : location.origin;
const API_URL = SERVER_ORIGIN + '/api';

const Auth = {
  token: () => localStorage.getItem('tf_token'),
  user: () => {
    try {
      return JSON.parse(localStorage.getItem('tf_user') || 'null');
    } catch (e) {
      return null;
    }
  },
  save(data) {
    localStorage.setItem('tf_token', data.token);
    localStorage.setItem(
      'tf_user',
      JSON.stringify({ _id: data._id, name: data.name, email: data.email, bio: data.bio })
    );
  },
  clear() {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
  },
};

// fetch wrapper: JSON in/out, auth header, readable errors.
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token()) headers.Authorization = 'Bearer ' + Auth.token();

  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Cannot reach the server. Is it running?');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      Auth.clear();
      location.href = 'login.html';
    }
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function requireAuth() {
  if (!Auth.token()) {
    location.href = 'login.html';
    return false;
  }
  return true;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Small pop-up message in the corner.
function toast(message, type = 'info') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// Modal helpers: <div class="modal" id="x" hidden> ... </div>
function openModal(id) {
  document.getElementById(id).hidden = false;
}
function closeModal(id) {
  document.getElementById(id).hidden = true;
}
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close-modal]') || e.target.classList.contains('modal')) {
    const modal = e.target.closest('.modal');
    if (modal) modal.hidden = true;
  }
});
