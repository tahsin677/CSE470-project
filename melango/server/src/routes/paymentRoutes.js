const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.post(
  '/checkout',
  [body('courseId').notEmpty().withMessage('courseId is required').isMongoId()],
  validate,
  controller.createCheckout
);

router.post('/confirm', controller.confirmPayment);
router.get('/my', controller.myPayments);

module.exports = router;
