const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');

async function getCourseOr404(courseId) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  return course;
}

function isCourseOwner(course, user) {
  return user.role === 'admin' || String(course.teacherId) === String(user._id);
}

// Teachers may only manage their own courses; admins may manage any.
async function assertCourseOwner(courseId, user) {
  const course = await getCourseOr404(courseId);
  if (!isCourseOwner(course, user)) {
    throw ApiError.forbidden('You can only manage your own courses');
  }
  return course;
}

// Owners, admins and enrolled students may read course content.
async function assertCourseAccess(courseId, user) {
  const course = await getCourseOr404(courseId);
  if (isCourseOwner(course, user)) return { course, enrollment: null };

  const enrollment = await Enrollment.findOne({
    courseId: course._id,
    studentId: user._id,
    status: { $ne: 'dropped' },
  });
  if (!enrollment) throw ApiError.forbidden('You are not enrolled in this course');
  return { course, enrollment };
}

async function getEnrolledStudentIds(courseId) {
  const enrollments = await Enrollment.find({
    courseId,
    status: { $ne: 'dropped' },
  }).select('studentId');
  return enrollments.map((e) => e.studentId);
}

// Course ids a user can see content for, based on their role.
async function getAccessibleCourseIds(user) {
  if (user.role === 'teacher') {
    const courses = await Course.find({ teacherId: user._id }).select('_id');
    return courses.map((c) => c._id);
  }
  if (user.role === 'student') {
    const enrollments = await Enrollment.find({
      studentId: user._id,
      status: { $ne: 'dropped' },
    }).select('courseId');
    return enrollments.map((e) => e.courseId);
  }
  const courses = await Course.find().select('_id');
  return courses.map((c) => c._id);
}

module.exports = {
  getCourseOr404,
  isCourseOwner,
  assertCourseOwner,
  assertCourseAccess,
  getEnrolledStudentIds,
  getAccessibleCourseIds,
};
