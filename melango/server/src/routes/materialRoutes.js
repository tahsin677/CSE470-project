const express = require('express');
const controller = require('../controllers/materialController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/:id/download', validateObjectId(), controller.downloadMaterial);
router.delete('/:id', authorize('teacher', 'admin'), validateObjectId(), controller.deleteMaterial);

module.exports = router;
