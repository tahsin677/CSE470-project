const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { getCourseOr404 } = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

function parseRating(value) {
  const rating = Number(value);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    throw ApiError.badRequest('Rating must be between 1 and 5');
  }
  return rating;
}

function assertStudent(user) {
  if (user.role !== 'student') throw ApiError.forbidden('Only students can leave reviews');
}

// POST /api/courses/:courseId/reviews  { rating, comment }
const upsertReview = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);
  assertStudent(req.user);
  const enrolled = await Enrollment.exists({ courseId: course._id, studentId: req.user._id });
  if (!enrolled) throw ApiError.forbidden('Only enrolled students can review this course');

  const rating = parseRating(req.body.rating);
  const review = await Review.findOneAndUpdate(
    { courseId: course._id, studentId: req.user._id, targetType: 'course' },
    {
      courseId: course._id,
      studentId: req.user._id,
      targetType: 'course',
      rating,
      comment: req.body.comment || '',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('studentId', 'name profileImage');

  await Review.recalculateCourseRating(course._id);
  await logActivity({
    userId: req.user._id,
    action: 'course.reviewed',
    description: `Rated "${course.courseName}" ${rating}/5`,
    courseId: course._id,
    entityType: 'Review',
    entityId: review._id,
  });
  await notify({
    userId: course.teacherId,
    title: 'New course review',
    message: `${req.user.name} rated "${course.courseName}" ${rating}/5`,
    type: 'system',
    courseId: course._id,
    link: '/app/reviews',
  });

  return created(res, review);
});

// GET /api/courses/:courseId/reviews
const listReviews = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);
  const reviews = await Review.find({ courseId: course._id, targetType: 'course' })
    .populate('studentId', 'name profileImage department semester')
    .sort({ createdAt: -1 });

  const distribution = [1, 2, 3, 4, 5].reduce((acc, star) => {
    acc[star] = reviews.filter((r) => r.rating === star).length;
    return acc;
  }, {});

  let myReview = null;
  if (req.user) {
    myReview = reviews.find((r) => String(r.studentId?._id) === String(req.user._id)) || null;
  }

  return ok(res, {
    reviews,
    averageRating: course.ratingAverage,
    totalReviews: reviews.length,
    distribution,
    myReview,
  });
});

// GET /api/reviews?targetType=app|teacher|course&teacherId=&courseId=
const listPlatformReviews = asyncHandler(async (req, res) => {
  const targetType = req.query.targetType || 'app';
  const filter = { targetType };
  if (targetType === 'teacher' && req.query.teacherId) filter.teacherId = req.query.teacherId;
  if (targetType === 'course' && req.query.courseId) filter.courseId = req.query.courseId;

  const reviews = await Review.find(filter)
    .populate('studentId', 'name role profileImage')
    .populate('teacherId', 'name designation')
    .populate('courseId', 'courseName')
    .sort({ createdAt: -1 });

  const average = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  const myReview = req.user
    ? reviews.find((r) => String(r.studentId?._id) === String(req.user._id)) || null
    : null;

  return ok(res, { reviews, averageRating: average, totalReviews: reviews.length, myReview });
});

// POST /api/reviews  { targetType, courseId?, teacherId?, rating, comment }
const upsertPlatformReview = asyncHandler(async (req, res) => {
  assertStudent(req.user);
  const targetType = req.body.targetType || 'app';
  if (!['course', 'teacher', 'app'].includes(targetType)) {
    throw ApiError.badRequest('targetType must be course, teacher, or app');
  }

  const rating = parseRating(req.body.rating);
  const comment = req.body.comment || '';

  if (targetType === 'course') {
    req.params.courseId = req.body.courseId;
    return upsertReview(req, res);
  }

  if (targetType === 'teacher') {
    const teacher = await User.findById(req.body.teacherId);
    if (!teacher || teacher.role !== 'teacher') throw ApiError.notFound('Teacher not found');
    const taught = await Course.find({ teacherId: teacher._id }).select('_id');
    const enrolled = await Enrollment.exists({
      studentId: req.user._id,
      courseId: { $in: taught.map((c) => c._id) },
    });
    if (!enrolled) throw ApiError.forbidden('Enroll in a course with this teacher before reviewing them');

    const review = await Review.findOneAndUpdate(
      { teacherId: teacher._id, studentId: req.user._id, targetType: 'teacher' },
      { teacherId: teacher._id, studentId: req.user._id, targetType: 'teacher', rating, comment },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('studentId', 'name profileImage').populate('teacherId', 'name designation');

    await notify({
      userId: teacher._id,
      title: 'New teacher review',
      message: `${req.user.name} rated you ${rating}/5`,
      type: 'system',
      link: '/app/reviews',
    });
    return created(res, review);
  }

  const review = await Review.findOneAndUpdate(
    { studentId: req.user._id, targetType: 'app' },
    { studentId: req.user._id, targetType: 'app', rating, comment },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('studentId', 'name profileImage');
  return created(res, review);
});

// DELETE /api/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  const isAuthor = String(review.studentId) === String(req.user._id);
  if (!isAuthor && req.user.role !== 'admin') throw ApiError.forbidden();

  const { courseId } = review;
  await review.deleteOne();
  if (courseId) await Review.recalculateCourseRating(courseId);

  return ok(res, { message: 'Review deleted successfully' });
});

module.exports = { upsertReview, listReviews, listPlatformReviews, upsertPlatformReview, deleteReview };
