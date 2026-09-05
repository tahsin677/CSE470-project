const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const {
  isCourseOwner,
  assertCourseAccess,
  getAccessibleCourseIds,
  getEnrolledStudentIds,
} = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');
const { notifyMany } = require('../services/notificationService');

// GET /api/announcements?courseId=
const listAnnouncements = asyncHandler(async (req, res) => {
  const { courseId } = req.query;

  if (courseId) {
    await assertCourseAccess(courseId, req.user);
    const announcements = await Announcement.find({ courseId })
      .populate('postedBy', 'name role profileImage')
      .populate('courseId', 'courseName')
      .sort({ createdAt: -1 });
    return ok(res, announcements);
  }

  // Without a course filter, return global announcements plus those for the
  // courses the caller teaches or is enrolled in.
  const courseIds = await getAccessibleCourseIds(req.user);
  const announcements = await Announcement.find({
    $or: [{ courseId: null }, { courseId: { $in: courseIds } }],
  })
    .populate('postedBy', 'name role profileImage')
    .populate('courseId', 'courseName')
    .sort({ createdAt: -1 });

  return ok(res, announcements);
});

// POST /api/announcements  { title, message, courseId? }
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, courseId } = req.body;
  if (!title || !message) throw ApiError.badRequest('Title and message are required');

  let course = null;
  if (courseId) {
    course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found');
    if (!isCourseOwner(course, req.user)) {
      throw ApiError.forbidden('You can only post announcements to your own courses');
    }
  } else if (req.user.role !== 'admin') {
    throw ApiError.forbidden('Only admins can post platform-wide announcements');
  }

  const announcement = await Announcement.create({
    title,
    message,
    courseId: course ? course._id : null,
    postedBy: req.user._id,
    isGlobal: !course,
  });

  const recipients = course
    ? await getEnrolledStudentIds(course._id)
    : (await User.find({ _id: { $ne: req.user._id } }).select('_id')).map((u) => u._id);

  await notifyMany(recipients, {
    title: course ? `Announcement: ${course.courseName}` : 'Platform announcement',
    message: title,
    type: 'announcement',
    courseId: course ? course._id : undefined,
    link: '/app/announcements',
  });
  await logActivity({
    userId: req.user._id,
    action: 'announcement.posted',
    description: `Posted announcement "${title}"`,
    courseId: course ? course._id : undefined,
    entityType: 'Announcement',
    entityId: announcement._id,
  });

  const populated = await announcement.populate([
    { path: 'postedBy', select: 'name role profileImage' },
    { path: 'courseId', select: 'courseName' },
  ]);
  return created(res, populated);
});

// DELETE /api/announcements/:id
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');

  const isAuthor = String(announcement.postedBy) === String(req.user._id);
  if (req.user.role !== 'admin' && !isAuthor) {
    throw ApiError.forbidden('You can only delete your own announcements');
  }

  await announcement.deleteOne();
  return ok(res, { message: 'Announcement deleted successfully' });
});

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
