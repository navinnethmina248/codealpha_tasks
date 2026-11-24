const express = require('express');
const {
  getNotifications,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllRead); // must be before '/:id/read'
router.put('/:id/read', markRead);

module.exports = router;
