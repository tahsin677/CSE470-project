const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/', controller.listConversations);
router.get('/unread/count', controller.unreadCount);

router.post(
  '/',
  [
    body('receiverId').notEmpty().withMessage('receiverId is required').isMongoId(),
    body('content').trim().notEmpty().withMessage('Message content is required'),
  ],
  validate,
  controller.sendMessage
);

router.get('/:userId', validateObjectId('userId'), controller.getConversation);

module.exports = router;
