const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { logActivity } = require('../services/activityService');

// GET /api/users  (admin)
const listUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  return ok(res, users.map((u) => u.toPublic()));
});

// GET /api/users/:id  (admin)
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user.toPublic());
});

// PATCH /api/users/:id/role  (admin)
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['student', 'teacher', 'admin'].includes(role)) {
    throw ApiError.badRequest('Role must be student, teacher or admin');
  }
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  user.role = role;
  await user.save();

  await logActivity({
    userId: req.user._id,
    action: 'user.role_updated',
    description: `${user.name} is now a ${role}`,
    entityType: 'User',
    entityId: user._id,
  });

  return ok(res, user.toPublic());
});

// DELETE /api/users/:id  (admin)
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  await Promise.all([
    Enrollment.deleteMany({ studentId: user._id }),
    Course.updateMany({ teacherId: user._id }, { isPublished: false }),
  ]);
  await user.deleteOne();

  await logActivity({
    userId: req.user._id,
    action: 'user.deleted',
    description: `Removed account ${user.email}`,
    entityType: 'User',
    entityId: user._id,
  });

  return ok(res, { message: 'User deleted successfully' });
});

// GET /api/users/contacts - people the current user shares a course with.
const listContacts = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role === 'admin') {
    const users = await User.find({ _id: { $ne: user._id } }).select(
      'name email role profileImage designation department'
    );
    return ok(res, users);
  }

  let contactIds = [];
  if (user.role === 'teacher') {
    const courses = await Course.find({ teacherId: user._id }).select('_id');
    const enrollments = await Enrollment.find({
      courseId: { $in: courses.map((c) => c._id) },
    }).select('studentId');
    contactIds = enrollments.map((e) => e.studentId);
  } else {
    const enrollments = await Enrollment.find({ studentId: user._id }).select('courseId');
    const courses = await Course.find({
      _id: { $in: enrollments.map((e) => e.courseId) },
    }).select('teacherId');
    contactIds = courses.map((c) => c.teacherId);
  }

  const admins = await User.find({ role: 'admin' }).select('_id');
  const ids = [...contactIds, ...admins.map((a) => a._id)].filter(
    (id) => String(id) !== String(user._id)
  );

  const contacts = await User.find({ _id: { $in: ids } }).select(
    'name email role profileImage designation department'
  );
  return ok(res, contacts);
});

module.exports = { listUsers, getUser, updateUserRole, deleteUser, listContacts };
