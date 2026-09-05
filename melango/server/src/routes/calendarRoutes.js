const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/calendarController');
const { protect, authorize } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/', controller.listEvents);

router.post(
  '/',
  authorize('teacher', 'admin', 'student'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('eventDate').notEmpty().withMessage('Event date is required').isISO8601(),
  ],
  validate,
  controller.createEvent
);

router.put('/:id', authorize('teacher', 'admin', 'student'), validateObjectId(), controller.updateEvent);
router.delete('/:id', authorize('teacher', 'admin', 'student'), validateObjectId(), controller.deleteEvent);

module.exports = router;
