const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/', controller.listAnnouncements);

router.post(
  '/',
  authorize('teacher', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validate,
  controller.createAnnouncement
);

router.delete('/:id', validateObjectId(), controller.deleteAnnouncement);

module.exports = router;
