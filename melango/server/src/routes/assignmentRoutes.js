const express = require('express');
const controller = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');
const { uploadSubmission } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/:id', validateObjectId(), controller.getAssignment);
router.put('/:id', authorize('teacher', 'admin'), validateObjectId(), controller.updateAssignment);
router.delete(
  '/:id',
  authorize('teacher', 'admin'),
  validateObjectId(),
  controller.deleteAssignment
);

router.post(
  '/:id/submissions',
  validateObjectId(),
  uploadSubmission.single('file'),
  controller.submitAssignment
);
router.get(
  '/:id/submissions',
  authorize('teacher', 'admin'),
  validateObjectId(),
  controller.listSubmissions
);

module.exports = router;
