const express = require('express');
const controller = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.get('/verify/:code', controller.verifyCertificate);

router.use(protect);

router.post(
  '/generate/:courseId',
  validateObjectId('courseId'),
  controller.generateCertificate
);
router.get('/my', controller.myCertificates);
router.get('/:id/download', validateObjectId(), controller.downloadCertificate);
router.get('/:id', validateObjectId(), controller.getCertificate);

module.exports = router;
