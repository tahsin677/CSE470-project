const express = require('express');
const controller = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/results/my', controller.myResults);

router.get('/:id', validateObjectId(), controller.getQuiz);
router.put('/:id', authorize('teacher', 'admin'), validateObjectId(), controller.updateQuiz);
router.delete('/:id', authorize('teacher', 'admin'), validateObjectId(), controller.deleteQuiz);

router.post('/:id/attempt', validateObjectId(), controller.attemptQuiz);
router.get('/:id/results', validateObjectId(), controller.quizResults);

module.exports = router;
