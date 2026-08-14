const express = require('express');
const controller = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/stats', controller.getStats);
router.get('/activity', controller.getActivity);

module.exports = router;
