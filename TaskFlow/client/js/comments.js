// Comments on a task (shown inside the task modal) with live updates.
let commentsTaskId = null;
let comments = [];

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('commentForm');
  if (!form || !Auth.token()) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text || !commentsTaskId) return;
    try {
      const comment = await api(`/comments/task/${commentsTaskId}`, {
        method: 'POST',
        body: { text },
      });
      form.reset();
      addComment(comment);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('commentList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-comment]');
    if (!btn) return;
    try {
      await api(`/comments/${btn.dataset.deleteComment}`, { method: 'DELETE' });
      removeComment(btn.dataset.deleteComment);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  onSocket('comment:created', (comment) => {
    if (comment.task === commentsTaskId) addComment(comment);
  });
  onSocket('comment:deleted', ({ commentId, taskId }) => {
    if (taskId === commentsTaskId) removeComment(commentId);
  });
});

async function openComments(taskId) {
  commentsTaskId = taskId;
  comments = [];
  renderComments();
  try {
    const loaded = await api(`/comments/task/${taskId}`);
    if (commentsTaskId === taskId) {
      comments = loaded;
      renderComments();
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

function closeComments() {
  commentsTaskId = null;
  comments = [];
}

function addComment(comment) {
  if (comments.some((c) => c._id === comment._id)) return; // already shown
  comments.push(comment);
  renderComments();
}

function removeComment(commentId) {
  comments = comments.filter((c) => c._id !== commentId);
  renderComments();
}

function renderComments() {
  const list = document.getElementById('commentList');
  if (!comments.length) {
    list.innerHTML = '<p class="muted small">No comments yet.</p>';
    return;
  }
  const me = Auth.user()._id;
  list.innerHTML = comments
    .map(
      (c) => `
      <div class="comment">
        <span class="avatar sm">${escapeHtml(initials(c.author.name))}</span>
        <div class="comment-body">
          <div><strong>${escapeHtml(c.author.name)}</strong>
            <span class="muted small">${formatDateTime(c.createdAt)}</span>
            ${c.author._id === me || isProjectOwner() ? `<button type="button" class="link-btn danger small" data-delete-comment="${c._id}">Delete</button>` : ''}
          </div>
          <p>${escapeHtml(c.text)}</p>
        </div>
      </div>`
    )
    .join('');
  list.scrollTop = list.scrollHeight;
}
