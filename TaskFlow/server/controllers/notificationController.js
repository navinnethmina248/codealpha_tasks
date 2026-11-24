const Notification = require('../models/Notification');
const { HttpError, asyncHandler } = require('../middleware/errorMiddleware');
const { emitToUser } = require('../config/socket');

// Internal helper used by other controllers: saves a notification and pushes it live.
const createNotification = async ({ user, type, message, link = '' }) => {
  const notification = await Notification.create({ user, type, message, link });
  emitToUser(user, 'notification:new', notification);
  return notification;
};

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).sort('-createdAt').limit(50),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ notifications, unreadCount });
});

// PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) throw new HttpError(404, 'Notification not found');
  res.json(notification);
});

// PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});

module.exports = { createNotification, getNotifications, markRead, markAllRead };
