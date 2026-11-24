const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HttpError, asyncHandler } = require('./errorMiddleware');

// Requires "Authorization: Bearer <token>" and attaches the user to req.user.
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Not authorized, no token');

  const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new HttpError(401, 'Not authorized, user no longer exists');

  req.user = user;
  next();
});

module.exports = { protect };
