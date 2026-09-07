const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.get('/', optionalAuth, controller.listPlatformReviews);
router.post(
  '/',
  protect,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim(),
  ],
  validate,
  controller.upsertPlatformReview
);
router.delete('/:id', protect, validateObjectId(), controller.deleteReview);

module.exports = router;
