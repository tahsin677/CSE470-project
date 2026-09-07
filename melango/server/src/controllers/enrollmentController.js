const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const Progress = require('../models/Progress');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { isCourseOwner } = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');
const emailService = require('../services/emailService');

// POST /api/enrollments/join  { enrollmentCode } or { courseId }
const joinCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    throw ApiError.forbidden('Only students can enroll in courses. Teachers create and teach them.');
  }

  const code = String(req.body.enrollmentCode || '').trim().toUpperCase();
  let course = null;
  if (req.body.courseId) {
    course = await Course.findById(req.body.courseId);
  } else if (code) {
    course = await Course.findOne({ enrollmentCode: code });
  } else {
    throw ApiError.badRequest('Provide an enrollment code or choose a course');
  }
  if (!course) throw ApiError.notFound('No matching course found');

  if (String(course.teacherId) === String(req.user._id)) {
    throw ApiError.badRequest('You are the instructor of this course');
  }

  const existing = await Enrollment.findOne({ courseId: course._id, studentId: req.user._id });
  if (existing) {
    if (existing.status === 'dropped') {
      existing.status = 'active';
      await existing.save();
      return ok(res, existing);
    }
    throw ApiError.conflict('You are already enrolled in this course');
  }

  // Premium courses require a completed payment before the seat is granted.
  if (course.isPremium && course.price > 0) {
    const paid = await Payment.findOne({
      courseId: course._id,
      studentId: req.user._id,
      status: 'paid',
    });
    if (!paid) {
      throw ApiError.badRequest(
        'This is a premium course. Complete the payment before enrolling.'
      );
    }
  }

  const enrollment = await Enrollment.create({
    courseId: course._id,
    studentId: req.user._id,
  });

  await Progress.updateOne(
    { courseId: course._id, studentId: req.user._id },
    { $setOnInsert: { completedMaterials: [], completionPercentage: 0 } },
    { upsert: true }
  );
  await Course.updateOne({ _id: course._id }, { $inc: { studentCount: 1 } });

  await logActivity({
    userId: req.user._id,
    action: 'course.joined',
    description: `Enrolled in "${course.courseName}"`,
    courseId: course._id,
    entityType: 'Enrollment',
    entityId: enrollment._id,
  });
  await notify({
    userId: course.teacherId,
    title: 'New student enrolled',
    message: `${req.user.name} joined "${course.courseName}"`,
    type: 'enrollment',
    courseId: course._id,
    link: `/courses/${course._id}`,
  });
  emailService.sendEnrollmentEmail(req.user, course);

  const populated = await enrollment.populate({
    path: 'courseId',
    populate: { path: 'teacherId', select: 'name email profileImage designation' },
  });
  return created(res, populated);
});

// GET /api/enrollments/my
const myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ studentId: req.user._id })
    .populate({
      path: 'courseId',
      populate: { path: 'teacherId', select: 'name email profileImage designation' },
    })
    .sort({ createdAt: -1 });

  const progressRecords = await Progress.find({ studentId: req.user._id });
  const progressByCourse = new Map(
    progressRecords.map((p) => [String(p.courseId), p.completionPercentage])
  );

  const data = enrollments
    .filter((e) => e.courseId)
    .map((e) => ({
      ...e.toObject(),
      completionPercentage: progressByCourse.get(String(e.courseId._id)) || 0,
    }));

  return ok(res, data);
});

// GET /api/enrollments/course/:courseId  (teacher/admin)
const courseEnrollments = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (!isCourseOwner(course, req.user)) {
    throw ApiError.forbidden('You can only view rosters for your own courses');
  }

  const enrollments = await Enrollment.find({ courseId: course._id })
    .populate('studentId', 'name email profileImage department semester')
    .sort({ createdAt: -1 });

  const progressRecords = await Progress.find({ courseId: course._id });
  const progressByStudent = new Map(
    progressRecords.map((p) => [String(p.studentId), p.completionPercentage])
  );

  const data = enrollments.map((e) => ({
    ...e.toObject(),
    completionPercentage: e.studentId
      ? progressByStudent.get(String(e.studentId._id)) || 0
      : 0,
  }));

  return ok(res, data);
});

// DELETE /api/enrollments/:id - student leaves, or owner/admin removes a student.
const removeEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id).populate('courseId');
  if (!enrollment) throw ApiError.notFound('Enrollment not found');

  const isOwnEnrollment = String(enrollment.studentId) === String(req.user._id);
  const canManage = enrollment.courseId && isCourseOwner(enrollment.courseId, req.user);
  if (!isOwnEnrollment && !canManage) throw ApiError.forbidden();

  await enrollment.deleteOne();
  if (enrollment.courseId) {
    await Course.updateOne(
      { _id: enrollment.courseId._id, studentCount: { $gt: 0 } },
      { $inc: { studentCount: -1 } }
    );
  }

  return ok(res, { message: 'Enrollment removed' });
});

module.exports = { joinCourse, myEnrollments, courseEnrollments, removeEnrollment };
