const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { getCourseOr404 } = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

// POST /api/courses/:courseId/reviews  { rating, comment }
const upsertReview = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);

  if (req.user.role !== 'student') {
    throw ApiError.forbidden('Only students can review a course');
  }
  const enrolled = await Enrollment.exists({ courseId: course._id, studentId: req.user._id });
  if (!enrolled) throw ApiError.forbidden('Only enrolled students can review this course');

  const rating = Number(req.body.rating);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    throw ApiError.badRequest('Rating must be between 1 and 5');
  }

  // A student has one review per course, so posting again edits it.
  const review = await Review.findOneAndUpdate(
    { courseId: course._id, studentId: req.user._id },
    { courseId: course._id, studentId: req.user._id, rating, comment: req.body.comment || '' },
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
    link: `/courses/${course._id}`,
  });

  return created(res, review);
});

// GET /api/courses/:courseId/reviews
const listReviews = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);

  const reviews = await Review.find({ courseId: course._id })
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

// DELETE /api/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  const isAuthor = String(review.studentId) === String(req.user._id);
  if (!isAuthor && req.user.role !== 'admin') throw ApiError.forbidden();

  const { courseId } = review;
  await review.deleteOne();
  await Review.recalculateCourseRating(courseId);

  return ok(res, { message: 'Review deleted successfully' });
});

module.exports = { upsertReview, listReviews, deleteReview };
