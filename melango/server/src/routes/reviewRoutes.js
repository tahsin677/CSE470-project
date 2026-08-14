const express = require('express');
const controller = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.delete('/:id', protect, validateObjectId(), controller.deleteReview);

module.exports = router;
