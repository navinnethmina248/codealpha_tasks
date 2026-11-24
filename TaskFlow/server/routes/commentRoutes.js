const express = require('express');
const {
  getComments,
  createComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.route('/task/:taskId').get(getComments).post(createComment);
router.delete('/:id', deleteComment);

module.exports = router;
