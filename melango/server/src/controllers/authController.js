const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { signToken } = require('../utils/token');
const { fileMeta } = require('../middleware/upload');
const emailService = require('../services/emailService');
const { logActivity } = require('../services/activityService');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, semester, designation } = req.body;

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // Admin accounts are provisioned by the seed script or promoted by an existing admin.
  const requestedRole = role === 'teacher' ? 'teacher' : 'student';

  const user = await User.create({
    name,
    email,
    password,
    role: requestedRole,
    department,
    semester,
    designation,
  });

  await logActivity({
    userId: user._id,
    action: 'account.registered',
    description: `${user.name} joined Melango as a ${user.role}`,
    entityType: 'User',
    entityId: user._id,
  });
  emailService.sendWelcomeEmail(user);

  return created(res, { token: signToken(user), user: user.toPublic() });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account has been deactivated');

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return ok(res, { token: signToken(user), user: user.toPublic() });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => ok(res, req.user.toPublic()));

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, department, semester, designation, profileImage } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (department !== undefined) user.department = department;
  if (semester !== undefined) user.semester = semester;
  if (designation !== undefined) user.designation = designation;

  if (req.file) {
    user.profileImage = fileMeta(req.file).fileUrl;
  } else if (profileImage !== undefined) {
    user.profileImage = profileImage;
  }

  await user.save();
  return ok(res, user.toPublic());
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword;
  await user.save();

  return ok(res, { message: 'Password updated successfully' });
});

module.exports = { register, login, me, updateProfile, changePassword };
