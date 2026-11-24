const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { HttpError, asyncHandler } = require('../middleware/errorMiddleware');
const { getProjectForMember, isOwner } = require('../utils/access');
const { createNotification } = require('./notificationController');
const { emitToProject } = require('../config/socket');

const populateTask = (query) => query.populate('assignee', 'name email').populate('createdBy', 'name');

// Assignee must be null or a member of the project.
const checkAssignee = (project, assignee) => {
  if (assignee && !project.members.some((m) => m.equals(assignee))) {
    throw new HttpError(400, 'Assignee must be a member of the project');
  }
};

const notifyAssignee = (project, task, actor) => {
  if (!task.assignee || task.assignee.equals(actor._id)) return null;
  return createNotification({
    user: task.assignee,
    type: 'task_assigned',
    message: `${actor.name} assigned you the task "${task.title}" in ${project.name}`,
    link: `project.html?id=${project._id}`,
  });
};

// GET /api/tasks/project/:projectId
const getTasks = asyncHandler(async (req, res) => {
  await getProjectForMember(req.params.projectId, req.user._id);
  const tasks = await populateTask(Task.find({ project: req.params.projectId }).sort('createdAt'));
  res.json(tasks);
});

// POST /api/tasks/project/:projectId
const createTask = asyncHandler(async (req, res) => {
  const project = await getProjectForMember(req.params.projectId, req.user._id);
  const { title, description, status, priority, dueDate, assignee } = req.body;
  checkAssignee(project, assignee || null);

  const task = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate: dueDate || null,
    assignee: assignee || null,
    project: project._id,
    createdBy: req.user._id,
  });

  await notifyAssignee(project, task, req.user);
  const populated = await populateTask(Task.findById(task._id));
  emitToProject(project._id, 'task:created', populated);
  res.status(201).json(populated);
});

// PUT /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new HttpError(404, 'Task not found');
  const project = await getProjectForMember(task.project, req.user._id);

  const previousAssignee = task.assignee ? String(task.assignee) : null;

  ['title', 'description', 'status', 'priority'].forEach((field) => {
    if (req.body[field] !== undefined) task[field] = req.body[field];
  });
  if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate || null;
  if (req.body.assignee !== undefined) {
    checkAssignee(project, req.body.assignee || null);
    task.assignee = req.body.assignee || null;
  }
  await task.save();

  if (task.assignee && String(task.assignee) !== previousAssignee) {
    await notifyAssignee(project, task, req.user);
  }

  const populated = await populateTask(Task.findById(task._id));
  emitToProject(project._id, 'task:updated', populated);
  res.json(populated);
});

// DELETE /api/tasks/:id  (task creator or project owner)
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new HttpError(404, 'Task not found');
  const project = await getProjectForMember(task.project, req.user._id);

  if (!task.createdBy.equals(req.user._id) && !isOwner(project, req.user._id)) {
    throw new HttpError(403, 'Only the task creator or project owner can delete this task');
  }

  await Comment.deleteMany({ task: task._id });
  await task.deleteOne();
  emitToProject(project._id, 'task:deleted', { taskId: task._id, projectId: project._id });
  res.json({ message: 'Task deleted' });
});

module.exports = { getTasks, createTask, updateTask, deleteTask };
