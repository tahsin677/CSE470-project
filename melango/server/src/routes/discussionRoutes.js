const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/discussionController');
const { protect } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/:id', validateObjectId(), controller.getDiscussion);

router.post(
  '/:id/reply',
  validateObjectId(),
  [body('message').trim().notEmpty().withMessage('Message is required')],
  validate,
  controller.replyToDiscussion
);

router.delete('/:id', validateObjectId(), controller.deleteDiscussion);

module.exports = router;
