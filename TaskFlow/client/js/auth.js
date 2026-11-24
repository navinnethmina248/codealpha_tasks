// Login, register, profile page and logout. Loaded on every page.

function logout() {
  Auth.clear();
  location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  // Pages that need a signed-in user
  if (document.body.hasAttribute('data-protected')) {
    if (!requireAuth()) return;
    const nameEl = document.getElementById('navUser');
    if (nameEl && Auth.user()) nameEl.textContent = Auth.user().name;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  // Login / register pages and the landing page skip ahead if already signed in
  if (['login', 'register', 'index'].includes(page) && Auth.token()) {
    location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const data = await api('/auth/login', {
          method: 'POST',
          body: {
            email: loginForm.email.value.trim(),
            password: loginForm.password.value,
          },
        });
        Auth.save(data);
        location.href = 'dashboard.html';
      } catch (err) {
        showFormError(loginForm, err.message);
        btn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (registerForm.password.value !== registerForm.confirmPassword.value) {
        return showFormError(registerForm, 'Passwords do not match');
      }
      const btn = registerForm.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const data = await api('/auth/register', {
          method: 'POST',
          body: {
            name: registerForm.name.value.trim(),
            email: registerForm.email.value.trim(),
            password: registerForm.password.value,
          },
        });
        Auth.save(data);
        location.href = 'dashboard.html';
      } catch (err) {
        showFormError(registerForm, err.message);
        btn.disabled = false;
      }
    });
  }

  if (page === 'profile') initProfilePage();
});

function showFormError(form, message) {
  const box = form.querySelector('.form-error');
  if (box) {
    box.textContent = message;
    box.hidden = false;
  } else {
    toast(message, 'error');
  }
}

// ---------- profile page ----------
async function initProfilePage() {
  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');

  try {
    const me = await api('/auth/me');
    profileForm.name.value = me.name;
    profileForm.email.value = me.email;
    profileForm.bio.value = me.bio || '';
    document.getElementById('profileAvatar').textContent = initials(me.name);
    document.getElementById('profileName').textContent = me.name;
  } catch (err) {
    toast(err.message, 'error');
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/profile', {
        method: 'PUT',
        body: { name: profileForm.name.value.trim(), bio: profileForm.bio.value.trim() },
      });
      Auth.save(data);
      document.getElementById('navUser').textContent = data.name;
      document.getElementById('profileAvatar').textContent = initials(data.name);
      document.getElementById('profileName').textContent = data.name;
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.value !== passwordForm.confirmPassword.value) {
      return toast('New passwords do not match', 'error');
    }
    try {
      const data = await api('/auth/profile', {
        method: 'PUT',
        body: {
          currentPassword: passwordForm.currentPassword.value,
          newPassword: passwordForm.newPassword.value,
        },
      });
      Auth.save(data);
      passwordForm.reset();
      toast('Password changed', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
