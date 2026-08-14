const express = require('express');
const controller = require('../controllers/gamificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/me', controller.getMyProfile);
router.get('/leaderboard', controller.getLeaderboard);

module.exports = router;
