const Project = require('../models/Project');
const { HttpError } = require('../middleware/errorMiddleware');

// Load a project and make sure the user belongs to it.
const getProjectForMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new HttpError(404, 'Project not found');
  if (!project.members.some((m) => m.equals(userId))) {
    throw new HttpError(403, 'You are not a member of this project');
  }
  return project;
};

const isOwner = (project, userId) => project.owner.equals(userId);

module.exports = { getProjectForMember, isOwner };
