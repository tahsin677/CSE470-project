const express = require('express');
const controller = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/', controller.listNotifications);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validateObjectId(), controller.markRead);
router.delete('/:id', validateObjectId(), controller.deleteNotification);

module.exports = router;
