const express = require('express');
const controller = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.post('/join', authorize('student'), controller.joinCourse);

router.get('/my', controller.myEnrollments);

router.get(
  '/course/:courseId',
  authorize('teacher', 'admin'),
  validateObjectId('courseId'),
  controller.courseEnrollments
);

router.delete('/:id', validateObjectId(), controller.removeEnrollment);

module.exports = router;
