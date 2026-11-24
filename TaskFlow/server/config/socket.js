const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const Project = require('../models/Project');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, { cors: { origin: true } });

  // Authenticate every socket with the same JWT used by the REST API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Not authorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name');
      if (!user) return next(new Error('Not authorized'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Not authorized'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room for notifications.
    socket.join(`user:${socket.user._id}`);

    socket.on('joinProject', async (projectId) => {
      try {
        const project = await Project.findById(projectId).select('members');
        if (project && project.members.some((m) => m.equals(socket.user._id))) {
          socket.join(`project:${projectId}`);
        }
      } catch (err) {
        /* invalid id - ignore */
      }
    });

    socket.on('leaveProject', (projectId) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
};

const emitToProject = (projectId, event, payload) => {
  if (io) io.to(`project:${projectId}`).emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

module.exports = { initSocket, emitToProject, emitToUser };
