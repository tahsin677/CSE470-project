const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const LearningMaterial = require('../models/LearningMaterial');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Announcement = require('../models/Announcement');
const Discussion = require('../models/Discussion');
const Review = require('../models/Review');
const Progress = require('../models/Progress');
const Attendance = require('../models/Attendance');
const CalendarEvent = require('../models/CalendarEvent');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { fileMeta } = require('../middleware/upload');
const { isCourseOwner } = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');

const TEACHER_FIELDS = 'name email profileImage designation department';

// GET /api/courses?search=&category=&instructor=
const listCourses = asyncHandler(async (req, res) => {
  const { search, category, instructor, mine } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { courseName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) filter.category = category;
  if (instructor) filter.teacherId = instructor;
  if (mine === 'true' && req.user) filter.teacherId = req.user._id;

  const courses = await Course.find(filter)
    .populate('teacherId', TEACHER_FIELDS)
    .sort({ createdAt: -1 });

  // Flags courses the requesting student has already joined.
  let enrolledIds = new Set();
  if (req.user && req.user.role === 'student') {
    const enrollments = await Enrollment.find({ studentId: req.user._id }).select('courseId');
    enrolledIds = new Set(enrollments.map((e) => String(e.courseId)));
  }

  const data = courses.map((course) => ({
    ...course.toObject(),
    isEnrolled: enrolledIds.has(String(course._id)),
  }));

  return ok(res, data);
});

// GET /api/courses/:id
const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate('teacherId', TEACHER_FIELDS);
  if (!course) throw ApiError.notFound('Course not found');

  const [materialCount, assignmentCount, quizCount, studentCount] = await Promise.all([
    LearningMaterial.countDocuments({ courseId: course._id }),
    Assignment.countDocuments({ courseId: course._id }),
    Quiz.countDocuments({ courseId: course._id }),
    Enrollment.countDocuments({ courseId: course._id, status: { $ne: 'dropped' } }),
  ]);

  let isEnrolled = false;
  let progress = null;
  if (req.user && req.user.role === 'student') {
    isEnrolled = Boolean(
      await Enrollment.exists({ courseId: course._id, studentId: req.user._id })
    );
    if (isEnrolled) {
      const record = await Progress.findOne({ courseId: course._id, studentId: req.user._id });
      progress = record ? record.completionPercentage : 0;
    }
  }

  return ok(res, {
    ...course.toObject(),
    stats: { materialCount, assignmentCount, quizCount, studentCount },
    isEnrolled,
    isOwner: req.user ? isCourseOwner(course, req.user) : false,
    progress,
  });
});

// POST /api/courses  (teacher/admin)
const createCourse = asyncHandler(async (req, res) => {
  const { courseName, description, category, price, isPremium, thumbnail } = req.body;

  const premium = isPremium === true || isPremium === 'true';
  const course = await Course.create({
    courseName,
    description,
    category,
    price: premium ? Number(price || 0) : 0,
    isPremium: premium,
    thumbnail: req.file ? fileMeta(req.file).fileUrl : thumbnail || '',
    teacherId: req.user.role === 'admin' && req.body.teacherId ? req.body.teacherId : req.user._id,
  });

  await logActivity({
    userId: req.user._id,
    action: 'course.created',
    description: `Created course "${course.courseName}"`,
    courseId: course._id,
    entityType: 'Course',
    entityId: course._id,
  });

  const populated = await course.populate('teacherId', TEACHER_FIELDS);
  return created(res, populated);
});

// PUT /api/courses/:id
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  if (!isCourseOwner(course, req.user)) {
    throw ApiError.forbidden('You can only edit your own courses');
  }

  const { courseName, description, category, price, isPremium, thumbnail, isPublished } = req.body;

  if (courseName !== undefined) course.courseName = courseName;
  if (description !== undefined) course.description = description;
  if (category !== undefined) course.category = category;
  if (isPremium !== undefined) course.isPremium = isPremium === true || isPremium === 'true';
  if (price !== undefined) course.price = Number(price) || 0;
  if (!course.isPremium) course.price = 0;
  if (isPublished !== undefined) course.isPublished = isPublished === true || isPublished === 'true';
  if (req.file) course.thumbnail = fileMeta(req.file).fileUrl;
  else if (thumbnail !== undefined) course.thumbnail = thumbnail;

  await course.save();

  await logActivity({
    userId: req.user._id,
    action: 'course.updated',
    description: `Updated course "${course.courseName}"`,
    courseId: course._id,
    entityType: 'Course',
    entityId: course._id,
  });

  const populated = await course.populate('teacherId', TEACHER_FIELDS);
  return ok(res, populated);
});

// DELETE /api/courses/:id - removes the course and everything attached to it.
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  if (!isCourseOwner(course, req.user)) {
    throw ApiError.forbidden('You can only delete your own courses');
  }

  const courseId = course._id;
  await Promise.all([
    Enrollment.deleteMany({ courseId }),
    LearningMaterial.deleteMany({ courseId }),
    Assignment.deleteMany({ courseId }),
    Quiz.deleteMany({ courseId }),
    Announcement.deleteMany({ courseId }),
    Discussion.deleteMany({ courseId }),
    Review.deleteMany({ courseId }),
    Progress.deleteMany({ courseId }),
    Attendance.deleteMany({ courseId }),
    CalendarEvent.deleteMany({ courseId }),
  ]);
  await course.deleteOne();

  await logActivity({
    userId: req.user._id,
    action: 'course.deleted',
    description: `Deleted course "${course.courseName}"`,
    entityType: 'Course',
    entityId: courseId,
  });

  return ok(res, { message: 'Course deleted successfully' });
});

// GET /api/courses/:id/students  (teacher/admin)
const listCourseStudents = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');
  if (!isCourseOwner(course, req.user)) throw ApiError.forbidden();

  const enrollments = await Enrollment.find({ courseId: course._id })
    .populate('studentId', 'name email profileImage department semester')
    .sort({ createdAt: -1 });

  return ok(res, enrollments);
});

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listCourseStudents,
};
