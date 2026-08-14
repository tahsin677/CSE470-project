const express = require('express');
const controller = require('../controllers/progressController');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/my', controller.myProgress);
router.get('/course/:courseId', validateObjectId('courseId'), controller.courseProgress);

router.post(
  '/material/:materialId/complete',
  validateObjectId('materialId'),
  controller.completeMaterial
);
router.delete(
  '/material/:materialId/complete',
  validateObjectId('materialId'),
  controller.uncompleteMaterial
);

module.exports = router;
