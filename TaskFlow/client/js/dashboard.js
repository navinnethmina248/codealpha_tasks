// Dashboard: list, create and delete projects.
let projects = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.token()) return;

  const user = Auth.user();
  document.getElementById('greeting').textContent = `Hi, ${user ? user.name : 'there'}`;

  document.getElementById('newProjectBtn').addEventListener('click', () => {
    document.getElementById('projectForm').reset();
    openModal('projectModal');
    document.getElementById('projectForm').name.focus();
  });

  document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const project = await api('/projects', {
        method: 'POST',
        body: { name: form.name.value.trim(), description: form.description.value.trim() },
      });
      closeModal('projectModal');
      location.href = `project.html?id=${project._id}`;
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('projectGrid').addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete]');
    if (!del) return;
    e.preventDefault();
    if (!confirm('Delete this project and all of its tasks? This cannot be undone.')) return;
    try {
      await api(`/projects/${del.dataset.delete}`, { method: 'DELETE' });
      toast('Project deleted', 'success');
      loadProjects();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Reload when someone adds us to / removes us from a project.
  document.addEventListener('tf:notification', (e) => {
    if (['project_invite', 'removed'].includes(e.detail.type)) loadProjects();
  });

  loadProjects();
});

async function loadProjects() {
  try {
    projects = await api('/projects');
    renderStats();
    renderProjects();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderStats() {
  const totals = projects.reduce(
    (acc, p) => {
      acc.tasks += p.stats.total;
      acc.done += p.stats.done;
      acc.open += p.stats.total - p.stats.done;
      return acc;
    },
    { tasks: 0, done: 0, open: 0 }
  );
  document.getElementById('statProjects').textContent = projects.length;
  document.getElementById('statOpen').textContent = totals.open;
  document.getElementById('statDone').textContent = totals.done;
}

function renderProjects() {
  const grid = document.getElementById('projectGrid');
  const me = Auth.user();

  if (!projects.length) {
    grid.innerHTML =
      '<p class="empty">No projects yet. Click <strong>+ New project</strong> to create your first one.</p>';
    return;
  }

  grid.innerHTML = projects
    .map((p) => {
      const percent = p.stats.total ? Math.round((p.stats.done / p.stats.total) * 100) : 0;
      const isOwner = me && p.owner._id === me._id;
      return `
      <a class="project-card" href="project.html?id=${p._id}">
        <div class="project-card-head">
          <h3>${escapeHtml(p.name)}</h3>
          ${isOwner ? `<button class="icon-btn danger" title="Delete project" data-delete="${p._id}">&#128465;</button>` : ''}
        </div>
        <p class="muted">${escapeHtml(p.description) || 'No description'}</p>
        <div class="progress"><div class="progress-bar" style="width:${percent}%"></div></div>
        <div class="project-meta">
          <span>${p.stats.done}/${p.stats.total} tasks done</span>
          <span>${p.members.length} member${p.members.length === 1 ? '' : 's'}</span>
        </div>
        <div class="avatars">
          ${p.members.slice(0, 5).map((m) => `<span class="avatar" title="${escapeHtml(m.name)}">${escapeHtml(initials(m.name))}</span>`).join('')}
        </div>
      </a>`;
    })
    .join('');
}
