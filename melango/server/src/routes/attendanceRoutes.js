const express = require('express');
const controller = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/my', controller.myAttendance);

module.exports = router;
