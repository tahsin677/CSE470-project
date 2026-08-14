const express = require('express');
const controller = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/contacts', controller.listContacts);

router.get('/', authorize('admin'), controller.listUsers);
router.get('/:id', authorize('admin'), validateObjectId(), controller.getUser);
router.patch('/:id/role', authorize('admin'), validateObjectId(), controller.updateUserRole);
router.delete('/:id', authorize('admin'), validateObjectId(), controller.deleteUser);

module.exports = router;
