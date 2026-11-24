// Project page: header, members, and wiring for the task board.
let currentProject = null;
const projectId = new URLSearchParams(location.search).get('id');

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.token()) return;
  if (!projectId) {
    location.href = 'dashboard.html';
    return;
  }
  initProject();
});

const isProjectOwner = () => currentProject && currentProject.owner._id === Auth.user()._id;

async function initProject() {
  try {
    await loadProject();
  } catch (err) {
    toast(err.message, 'error');
    setTimeout(() => (location.href = 'dashboard.html'), 1500);
    return;
  }

  await initTasks(); // tasks.js
  joinProjectRoom(projectId);

  onSocket('project:updated', async (payload) => {
    if (payload.projectId !== projectId) return;
    if (payload.removedUserId === Auth.user()._id) {
      toast('You were removed from this project', 'error');
      return setTimeout(() => (location.href = 'dashboard.html'), 1200);
    }
    try {
      await loadProject();
      renderAssigneeOptions(); // tasks.js
      renderBoard(); // tasks.js
    } catch (err) {
      /* ignore */
    }
  });

  onSocket('project:deleted', (payload) => {
    if (payload.projectId !== projectId) return;
    toast('This project was deleted', 'error');
    setTimeout(() => (location.href = 'dashboard.html'), 1200);
  });

  bindProjectActions();
}

async function loadProject() {
  currentProject = await api(`/projects/${projectId}`);
  document.title = `${currentProject.name} - TaskFlow`;
  document.getElementById('projectName').textContent = currentProject.name;
  document.getElementById('projectDesc').textContent = currentProject.description || 'No description';
  document.getElementById('ownerActions').hidden = !isProjectOwner();
  document.getElementById('addMemberForm').hidden = !isProjectOwner();
  renderMembers();
}

function renderMembers() {
  const list = document.getElementById('memberList');
  list.innerHTML = currentProject.members
    .map((m) => {
      const owner = m._id === currentProject.owner._id;
      return `
      <li>
        <span class="avatar">${escapeHtml(initials(m.name))}</span>
        <div class="member-info">
          <strong>${escapeHtml(m.name)}</strong>${owner ? ' <span class="tag">Owner</span>' : ''}
          <div class="muted small">${escapeHtml(m.email)}</div>
        </div>
        ${isProjectOwner() && !owner ? `<button class="icon-btn danger" title="Remove" data-remove-member="${m._id}">&times;</button>` : ''}
      </li>`;
    })
    .join('');
}

function bindProjectActions() {
  document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      currentProject = await api(`/projects/${projectId}/members`, {
        method: 'POST',
        body: { email: form.email.value.trim() },
      });
      form.reset();
      renderMembers();
      renderAssigneeOptions();
      toast('Member added', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('memberList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-remove-member]');
    if (!btn || !confirm('Remove this member from the project?')) return;
    try {
      currentProject = await api(`/projects/${projectId}/members/${btn.dataset.removeMember}`, {
        method: 'DELETE',
      });
      renderMembers();
      renderAssigneeOptions();
      await initTasks();
      toast('Member removed', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('editProjectBtn').addEventListener('click', () => {
    const form = document.getElementById('editProjectForm');
    form.name.value = currentProject.name;
    form.description.value = currentProject.description || '';
    openModal('editProjectModal');
  });

  document.getElementById('editProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      currentProject = await api(`/projects/${projectId}`, {
        method: 'PUT',
        body: { name: form.name.value.trim(), description: form.description.value.trim() },
      });
      closeModal('editProjectModal');
      await loadProject();
      toast('Project updated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('deleteProjectBtn').addEventListener('click', async () => {
    if (!confirm('Delete this project and all of its tasks? This cannot be undone.')) return;
    try {
      await api(`/projects/${projectId}`, { method: 'DELETE' });
      location.href = 'dashboard.html';
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
