// Kanban board: render tasks, create/edit/delete, drag & drop, live updates.
let tasks = [];
let editingTaskId = null;
let tasksBound = false;
const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

async function initTasks() {
  try {
    tasks = await api(`/tasks/project/${projectId}`);
  } catch (err) {
    toast(err.message, 'error');
    tasks = [];
  }
  renderAssigneeOptions();
  renderBoard();
  if (!tasksBound) {
    bindTaskEvents();
    tasksBound = true;
  }
}

function renderAssigneeOptions() {
  const select = document.querySelector('#taskForm select[name=assignee]');
  const previous = select.value;
  select.innerHTML =
    '<option value="">Unassigned</option>' +
    currentProject.members
      .map((m) => `<option value="${m._id}">${escapeHtml(m.name)}</option>`)
      .join('');
  select.value = previous;
}

function visibleTasks() {
  const mineOnly = document.getElementById('filterMine').checked;
  const priority = document.getElementById('filterPriority').value;
  const search = document.getElementById('filterSearch').value.trim().toLowerCase();
  const me = Auth.user()._id;
  return tasks.filter(
    (t) =>
      (!mineOnly || (t.assignee && t.assignee._id === me)) &&
      (!priority || t.priority === priority) &&
      (!search || t.title.toLowerCase().includes(search))
  );
}

function renderBoard() {
  const shown = visibleTasks();
  const today = new Date().setHours(0, 0, 0, 0);

  STATUSES.forEach((status) => {
    const items = shown.filter((t) => t.status === status);
    document.getElementById(`count-${status}`).textContent = items.length;
    document.getElementById(`list-${status}`).innerHTML =
      items
        .map((t) => {
          const overdue = t.dueDate && status !== 'done' && new Date(t.dueDate) < today;
          return `
        <div class="task-card" draggable="true" data-id="${t._id}">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            <span class="tag prio-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
            ${t.dueDate ? `<span class="due ${overdue ? 'overdue' : ''}">&#128197; ${formatDate(t.dueDate)}</span>` : ''}
            ${
              t.assignee
                ? `<span class="avatar sm" title="${escapeHtml(t.assignee.name)}">${escapeHtml(initials(t.assignee.name))}</span>`
                : ''
            }
          </div>
        </div>`;
        })
        .join('') || '<p class="muted small empty-col">No tasks</p>';
  });
}

// ----- modal -----
function openTaskModal(task, defaultStatus = 'todo') {
  const form = document.getElementById('taskForm');
  form.reset();
  editingTaskId = task ? task._id : null;

  document.getElementById('taskModalTitle').textContent = task ? 'Edit task' : 'New task';
  form.title.value = task ? task.title : '';
  form.description.value = task ? task.description : '';
  form.status.value = task ? task.status : defaultStatus;
  form.priority.value = task ? task.priority : 'medium';
  form.dueDate.value = task && task.dueDate ? task.dueDate.slice(0, 10) : '';
  form.assignee.value = task && task.assignee ? task.assignee._id : '';

  const me = Auth.user()._id;
  const canDelete = task && (task.createdBy._id === me || isProjectOwner());
  document.getElementById('deleteTaskBtn').hidden = !canDelete;
  document.getElementById('commentsSection').hidden = !task;

  openModal('taskModal');
  if (task) openComments(task._id); // comments.js
  else {
    closeComments(); // comments.js
    form.title.focus();
  }
}

function upsertTask(task) {
  const index = tasks.findIndex((t) => t._id === task._id);
  if (index >= 0) tasks[index] = task;
  else tasks.push(task);
  renderBoard();
}

async function moveTask(taskId, status) {
  const task = tasks.find((t) => t._id === taskId);
  if (!task || task.status === status) return;
  const previous = task.status;
  task.status = status; // optimistic
  renderBoard();
  try {
    upsertTask(await api(`/tasks/${taskId}`, { method: 'PUT', body: { status } }));
  } catch (err) {
    task.status = previous;
    renderBoard();
    toast(err.message, 'error');
  }
}

function bindTaskEvents() {
  // "+" buttons in column headers and the main button
  document.querySelectorAll('[data-add-task]').forEach((btn) =>
    btn.addEventListener('click', () => openTaskModal(null, btn.dataset.addTask))
  );

  // Open a card
  document.getElementById('board').addEventListener('click', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    openTaskModal(tasks.find((t) => t._id === card.dataset.id));
  });

  // Filters
  ['filterMine', 'filterPriority', 'filterSearch'].forEach((id) =>
    document.getElementById(id).addEventListener('input', renderBoard)
  );

  // Drag & drop
  const board = document.getElementById('board');
  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    e.dataTransfer.setData('text/plain', card.dataset.id);
    card.classList.add('dragging');
  });
  board.addEventListener('dragend', (e) => {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.task-list').forEach((l) => l.classList.remove('drag-over'));
  });
  board.addEventListener('dragover', (e) => {
    const list = e.target.closest('.task-list');
    if (!list) return;
    e.preventDefault();
    document.querySelectorAll('.task-list').forEach((l) => l.classList.toggle('drag-over', l === list));
  });
  board.addEventListener('drop', (e) => {
    const list = e.target.closest('.task-list');
    if (!list) return;
    e.preventDefault();
    moveTask(e.dataTransfer.getData('text/plain'), list.dataset.status);
  });

  // Save (create or update)
  document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      status: form.status.value,
      priority: form.priority.value,
      dueDate: form.dueDate.value || null,
      assignee: form.assignee.value || null,
    };
    try {
      const saved = editingTaskId
        ? await api(`/tasks/${editingTaskId}`, { method: 'PUT', body })
        : await api(`/tasks/project/${projectId}`, { method: 'POST', body });
      upsertTask(saved);
      closeModal('taskModal');
      toast(editingTaskId ? 'Task updated' : 'Task created', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Delete
  document.getElementById('deleteTaskBtn').addEventListener('click', async () => {
    if (!editingTaskId || !confirm('Delete this task and its comments?')) return;
    try {
      await api(`/tasks/${editingTaskId}`, { method: 'DELETE' });
      tasks = tasks.filter((t) => t._id !== editingTaskId);
      renderBoard();
      closeModal('taskModal');
      toast('Task deleted', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Live updates from teammates
  onSocket('task:created', upsertTask);
  onSocket('task:updated', upsertTask);
  onSocket('task:deleted', ({ taskId }) => {
    tasks = tasks.filter((t) => t._id !== taskId);
    renderBoard();
    const modalOpen = !document.getElementById('taskModal').hidden;
    if (modalOpen && editingTaskId === taskId) {
      closeModal('taskModal');
      toast('This task was deleted by someone else', 'info');
    }
  });
}
