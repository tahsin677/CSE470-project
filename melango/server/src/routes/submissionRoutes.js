const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/my', controller.mySubmissions);
router.get('/:id/download', validateObjectId(), controller.downloadSubmission);

router.post(
  '/:id/feedback',
  authorize('teacher', 'admin'),
  validateObjectId(),
  [body('marks').isFloat({ min: 0 }).withMessage('Marks must be a positive number')],
  validate,
  controller.gradeSubmission
);

module.exports = router;
