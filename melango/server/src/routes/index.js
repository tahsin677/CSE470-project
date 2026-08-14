const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/courses', require('./courseRoutes'));
router.use('/enrollments', require('./enrollmentRoutes'));
router.use('/materials', require('./materialRoutes'));
router.use('/assignments', require('./assignmentRoutes'));
router.use('/submissions', require('./submissionRoutes'));
router.use('/quizzes', require('./quizRoutes'));
router.use('/announcements', require('./announcementRoutes'));
router.use('/discussions', require('./discussionRoutes'));
router.use('/messages', require('./messageRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/progress', require('./progressRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/certificates', require('./certificateRoutes'));
router.use('/calendar', require('./calendarRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/gamification', require('./gamificationRoutes'));

module.exports = router;
