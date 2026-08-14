const express = require('express');
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const materialController = require('../controllers/materialController');
const assignmentController = require('../controllers/assignmentController');
const quizController = require('../controllers/quizController');
const discussionController = require('../controllers/discussionController');
const reviewController = require('../controllers/reviewController');
const attendanceController = require('../controllers/attendanceController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const { uploadThumbnail, uploadMaterial } = require('../middleware/upload');

const router = express.Router();

router.get('/', optionalAuth, courseController.listCourses);
router.get('/:id', optionalAuth, validateObjectId(), courseController.getCourse);

router.post(
  '/',
  protect,
  authorize('teacher', 'admin'),
  uploadThumbnail.single('thumbnail'),
  [
    body('courseName').trim().notEmpty().withMessage('Course name is required'),
    body('category').optional().trim(),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be zero or more'),
  ],
  validate,
  courseController.createCourse
);

router.put(
  '/:id',
  protect,
  authorize('teacher', 'admin'),
  validateObjectId(),
  uploadThumbnail.single('thumbnail'),
  courseController.updateCourse
);

router.delete(
  '/:id',
  protect,
  authorize('teacher', 'admin'),
  validateObjectId(),
  courseController.deleteCourse
);

router.get(
  '/:id/students',
  protect,
  authorize('teacher', 'admin'),
  validateObjectId(),
  courseController.listCourseStudents
);

/* ---- Nested course resources ---- */

router.get(
  '/:courseId/materials',
  protect,
  validateObjectId('courseId'),
  materialController.listMaterials
);
router.post(
  '/:courseId/materials',
  protect,
  authorize('teacher', 'admin'),
  validateObjectId('courseId'),
  uploadMaterial.single('file'),
  materialController.createMaterial
);

router.get(
  '/:courseId/assignments',
  protect,
  validateObjectId('courseId'),
  assignmentController.listAssignments
);
router.post(
  '/:courseId/assignments',
  protect,
  authorize('teacher', 'admin'),
  validateObjectId('courseId'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('dueDate').notEmpty().withMessage('Due date is required').isISO8601(),
  ],
  validate,
  assignmentController.createAssignment
);

router.get(
  '/:courseId/quizzes',
  protect,
  validateObjectId('courseId'),
  quizController.listQuizzes
);
router.post(
  '/:courseId/quizzes',
  protect,
  authorize('teacher', 'admin'),
  validateObjectId('courseId'),
  [body('title').trim().notEmpty().withMessage('Title is required')],
  validate,
  quizController.createQuiz
);

router.get(
  '/:courseId/discussions',
  protect,
  validateObjectId('courseId'),
  discussionController.listDiscussions
);
router.post(
  '/:courseId/discussions',
  protect,
  validateObjectId('courseId'),
  [
    body('topic').trim().notEmpty().withMessage('Topic is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validate,
  discussionController.createDiscussion
);

router.get(
  '/:courseId/reviews',
  optionalAuth,
  validateObjectId('courseId'),
  reviewController.listReviews
);
router.post(
  '/:courseId/reviews',
  protect,
  validateObjectId('courseId'),
  [body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')],
  validate,
  reviewController.upsertReview
);

router.get(
  '/:courseId/attendance',
  protect,
  validateObjectId('courseId'),
  attendanceController.courseAttendance
);
router.post(
  '/:courseId/attendance',
  protect,
  authorize('teacher', 'admin'),
  validateObjectId('courseId'),
  [
    body('date').notEmpty().withMessage('Date is required'),
    body('records').isArray({ min: 1 }).withMessage('At least one record is required'),
  ],
  validate,
  attendanceController.takeAttendance
);

module.exports = router;
