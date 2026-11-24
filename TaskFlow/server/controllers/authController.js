const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { HttpError, asyncHandler } = require('../middleware/errorMiddleware');

const userPayload = (user, withToken = false) => {
  const data = { _id: user._id, name: user.name, email: user.email, bio: user.bio };
  if (withToken) data.token = generateToken(user._id);
  return data;
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw new HttpError(400, 'An account with this email already exists');

  const user = await User.create({ name, email, password });
  res.status(201).json(userPayload(user, true));
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  res.json(userPayload(user, true));
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json(userPayload(req.user));
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (name !== undefined) user.name = name;
  if (bio !== undefined) user.bio = bio;

  if (newPassword) {
    if (!currentPassword || !(await user.matchPassword(currentPassword))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    user.password = newPassword;
  }

  await user.save();
  res.json(userPayload(user, true));
});

module.exports = { register, login, getMe, updateProfile };
