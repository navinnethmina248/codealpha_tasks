const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { HttpError, asyncHandler } = require('../middleware/errorMiddleware');
const { getProjectForMember, isOwner } = require('../utils/access');
const { createNotification } = require('./notificationController');
const { emitToProject } = require('../config/socket');

const loadTaskForMember = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, 'Task not found');
  const project = await getProjectForMember(task.project, userId);
  return { task, project };
};

// GET /api/comments/task/:taskId
const getComments = asyncHandler(async (req, res) => {
  await loadTaskForMember(req.params.taskId, req.user._id);
  const comments = await Comment.find({ task: req.params.taskId })
    .populate('author', 'name')
    .sort('createdAt');
  res.json(comments);
});

// POST /api/comments/task/:taskId
const createComment = asyncHandler(async (req, res) => {
  const { task, project } = await loadTaskForMember(req.params.taskId, req.user._id);

  const comment = await Comment.create({
    task: task._id,
    project: project._id,
    author: req.user._id,
    text: req.body.text,
  });

  // Tell the assignee and the task creator (except the commenter).
  const recipients = new Set(
    [task.assignee, task.createdBy].filter(Boolean).map(String)
  );
  recipients.delete(String(req.user._id));
  await Promise.all(
    [...recipients].map((userId) =>
      createNotification({
        user: userId,
        type: 'comment',
        message: `${req.user.name} commented on "${task.title}"`,
        link: `project.html?id=${project._id}`,
      })
    )
  );

  const populated = await Comment.findById(comment._id).populate('author', 'name');
  emitToProject(project._id, 'comment:created', populated);
  res.status(201).json(populated);
});

// DELETE /api/comments/:id  (comment author or project owner)
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new HttpError(404, 'Comment not found');
  const project = await getProjectForMember(comment.project, req.user._id);

  if (!comment.author.equals(req.user._id) && !isOwner(project, req.user._id)) {
    throw new HttpError(403, 'You cannot delete this comment');
  }

  await comment.deleteOne();
  emitToProject(project._id, 'comment:deleted', {
    commentId: comment._id,
    taskId: comment.task,
  });
  res.json({ message: 'Comment deleted' });
});

module.exports = { getComments, createComment, deleteComment };
