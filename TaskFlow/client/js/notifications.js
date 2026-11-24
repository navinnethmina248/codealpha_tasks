// Notification bell: loads history, receives live notifications, marks as read.
let notifications = [];

document.addEventListener('DOMContentLoaded', () => {
  const bell = document.getElementById('bellBtn');
  if (!bell || !Auth.token()) return;

  const panel = document.getElementById('notifPanel');
  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target)) panel.hidden = true;
  });

  document.getElementById('markAllRead').addEventListener('click', async () => {
    try {
      await api('/notifications/read-all', { method: 'PUT' });
      notifications.forEach((n) => (n.read = true));
      renderNotifications();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('notifList').addEventListener('click', async (e) => {
    const item = e.target.closest('.notif-item');
    if (!item) return;
    const n = notifications.find((x) => x._id === item.dataset.id);
    if (n && !n.read) {
      n.read = true;
      api(`/notifications/${n._id}/read`, { method: 'PUT' }).catch(() => {});
    }
    if (n && n.link) location.href = n.link;
    else renderNotifications();
  });

  loadNotifications();

  onSocket('notification:new', (n) => {
    notifications.unshift(n);
    renderNotifications();
    toast(n.message, 'info');
    // Let pages react (e.g. dashboard reloads its project list on an invite).
    document.dispatchEvent(new CustomEvent('tf:notification', { detail: n }));
  });
});

async function loadNotifications() {
  try {
    const data = await api('/notifications');
    notifications = data.notifications;
    renderNotifications();
  } catch (err) {
    /* non-critical */
  }
}

function renderNotifications() {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');
  const unread = notifications.filter((n) => !n.read).length;

  badge.textContent = unread > 9 ? '9+' : unread;
  badge.hidden = unread === 0;

  if (!notifications.length) {
    list.innerHTML = '<p class="muted pad">No notifications yet.</p>';
    return;
  }
  list.innerHTML = notifications
    .map(
      (n) => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n._id}">
        <p>${escapeHtml(n.message)}</p>
        <span class="muted small">${formatDateTime(n.createdAt)}</span>
      </div>`
    )
    .join('');
}
