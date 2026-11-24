const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { HttpError, asyncHandler } = require('../middleware/errorMiddleware');
const { getProjectForMember, isOwner } = require('../utils/access');
const { createNotification } = require('./notificationController');
const { emitToProject } = require('../config/socket');

const populateProject = (query) =>
  query.populate('owner', 'name email').populate('members', 'name email');

// GET /api/projects  - projects the user belongs to, with task counts
const getProjects = asyncHandler(async (req, res) => {
  const projects = await populateProject(
    Project.find({ members: req.user._id }).sort('-updatedAt')
  ).lean();

  const counts = await Task.aggregate([
    { $match: { project: { $in: projects.map((p) => p._id) } } },
    { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
  ]);

  projects.forEach((p) => {
    p.stats = { todo: 0, in_progress: 0, done: 0, total: 0 };
    counts
      .filter((c) => c._id.project.equals(p._id))
      .forEach((c) => {
        p.stats[c._id.status] = c.count;
        p.stats.total += c.count;
      });
  });

  res.json(projects);
});

// POST /api/projects
const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    members: [req.user._id],
  });
  res.status(201).json(await populateProject(Project.findById(project._id)));
});

// GET /api/projects/:id
const getProject = asyncHandler(async (req, res) => {
  await getProjectForMember(req.params.id, req.user._id);
  res.json(await populateProject(Project.findById(req.params.id)));
});

// PUT /api/projects/:id  (owner only)
const updateProject = asyncHandler(async (req, res) => {
  const project = await getProjectForMember(req.params.id, req.user._id);
  if (!isOwner(project, req.user._id)) throw new HttpError(403, 'Only the owner can edit this project');

  if (req.body.name !== undefined) project.name = req.body.name;
  if (req.body.description !== undefined) project.description = req.body.description;
  await project.save();

  emitToProject(project._id, 'project:updated', { projectId: project._id });
  res.json(await populateProject(Project.findById(project._id)));
});

// DELETE /api/projects/:id  (owner only)
const deleteProject = asyncHandler(async (req, res) => {
  const project = await getProjectForMember(req.params.id, req.user._id);
  if (!isOwner(project, req.user._id)) throw new HttpError(403, 'Only the owner can delete this project');

  await Comment.deleteMany({ project: project._id });
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();

  emitToProject(project._id, 'project:deleted', { projectId: project._id });
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/members  { email }  (owner only)
const addMember = asyncHandler(async (req, res) => {
  const project = await getProjectForMember(req.params.id, req.user._id);
  if (!isOwner(project, req.user._id)) throw new HttpError(403, 'Only the owner can add members');

  const email = String(req.body.email || '').toLowerCase().trim();
  if (!email) throw new HttpError(400, 'Email is required');

  const user = await User.findOne({ email });
  if (!user) throw new HttpError(404, 'No user with that email. They need to register first.');
  if (project.members.some((m) => m.equals(user._id))) {
    throw new HttpError(400, 'That user is already a member');
  }

  project.members.push(user._id);
  await project.save();

  await createNotification({
    user: user._id,
    type: 'project_invite',
    message: `${req.user.name} added you to the project "${project.name}"`,
    link: `project.html?id=${project._id}`,
  });
  emitToProject(project._id, 'project:updated', { projectId: project._id });

  res.json(await populateProject(Project.findById(project._id)));
});

// DELETE /api/projects/:id/members/:userId  (owner only)
const removeMember = asyncHandler(async (req, res) => {
  const project = await getProjectForMember(req.params.id, req.user._id);
  if (!isOwner(project, req.user._id)) throw new HttpError(403, 'Only the owner can remove members');

  const { userId } = req.params;
  if (project.owner.equals(userId)) throw new HttpError(400, 'The owner cannot be removed');
  if (!project.members.some((m) => m.equals(userId))) throw new HttpError(404, 'User is not a member');

  project.members.pull(userId);
  await project.save();
  await Task.updateMany({ project: project._id, assignee: userId }, { assignee: null });

  await createNotification({
    user: userId,
    type: 'removed',
    message: `You were removed from the project "${project.name}"`,
    link: 'dashboard.html',
  });
  emitToProject(project._id, 'project:updated', { projectId: project._id, removedUserId: userId });

  res.json(await populateProject(Project.findById(project._id)));
});

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
