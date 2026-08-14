const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const {
  assertCourseAccess,
  assertCourseOwner,
  isCourseOwner,
  getEnrolledStudentIds,
} = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');
const { notify, notifyMany } = require('../services/notificationService');

function normalizeQuestions(rawQuestions) {
  let questions = rawQuestions;
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (err) {
      throw ApiError.badRequest('questions must be valid JSON');
    }
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw ApiError.badRequest('A quiz needs at least one question');
  }

  return questions.map((q, index) => {
    const options = Array.isArray(q.options) ? q.options.filter((o) => String(o).trim() !== '') : [];
    if (!q.questionText) throw ApiError.badRequest(`Question ${index + 1} is missing its text`);
    if (options.length < 2) {
      throw ApiError.badRequest(`Question ${index + 1} needs at least two options`);
    }
    const correctIndex = Number(q.correctIndex);
    if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      throw ApiError.badRequest(`Question ${index + 1} has an invalid correct answer`);
    }
    return {
      questionText: q.questionText,
      options,
      correctIndex,
      marks: q.marks !== undefined ? Number(q.marks) : 1,
    };
  });
}

// GET /api/courses/:courseId/quizzes
const listQuizzes = asyncHandler(async (req, res) => {
  const { course } = await assertCourseAccess(req.params.courseId, req.user);
  const quizzes = await Quiz.find({ courseId: course._id }).sort({ createdAt: -1 });

  if (req.user.role === 'student') {
    const results = await Result.find({
      studentId: req.user._id,
      quizId: { $in: quizzes.map((q) => q._id) },
    });
    const byQuiz = new Map(results.map((r) => [String(r.quizId), r]));

    const data = quizzes.map((q) => ({
      ...q.toStudentView(),
      myResult: byQuiz.get(String(q._id)) || null,
    }));
    return ok(res, data);
  }

  const counts = await Result.aggregate([
    { $match: { quizId: { $in: quizzes.map((q) => q._id) } } },
    { $group: { _id: '$quizId', attempts: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c]));

  const data = quizzes.map((q) => {
    const stat = countMap.get(String(q._id));
    return {
      ...q.toObject({ virtuals: true }),
      attemptCount: stat ? stat.attempts : 0,
      averagePercentage: stat ? Math.round(stat.avgScore) : 0,
    };
  });
  return ok(res, data);
});

// GET /api/quizzes/:id - students receive the answer key stripped out.
const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw ApiError.notFound('Quiz not found');

  const { course } = await assertCourseAccess(quiz.courseId, req.user);

  if (isCourseOwner(course, req.user)) return ok(res, quiz.toObject({ virtuals: true }));

  const myResult = await Result.findOne({ quizId: quiz._id, studentId: req.user._id });
  return ok(res, { ...quiz.toStudentView(), myResult });
});

// POST /api/courses/:courseId/quizzes
const createQuiz = asyncHandler(async (req, res) => {
  const course = await assertCourseOwner(req.params.courseId, req.user);
  const { title, description, durationMinutes, availableFrom, availableUntil } = req.body;

  if (!title) throw ApiError.badRequest('Title is required');
  const questions = normalizeQuestions(req.body.questions);

  const quiz = await Quiz.create({
    courseId: course._id,
    createdBy: req.user._id,
    title,
    description: description || '',
    durationMinutes: durationMinutes ? Number(durationMinutes) : 15,
    availableFrom,
    availableUntil,
    questions,
  });

  const studentIds = await getEnrolledStudentIds(course._id);
  await notifyMany(studentIds, {
    title: 'New quiz available',
    message: `"${quiz.title}" was added to ${course.courseName}`,
    type: 'quiz',
    courseId: course._id,
    link: `/quizzes/${quiz._id}`,
  });
  await logActivity({
    userId: req.user._id,
    action: 'quiz.created',
    description: `Created quiz "${quiz.title}"`,
    courseId: course._id,
    entityType: 'Quiz',
    entityId: quiz._id,
  });

  return created(res, quiz.toObject({ virtuals: true }));
});

// PUT /api/quizzes/:id
const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw ApiError.notFound('Quiz not found');

  const course = await Course.findById(quiz.courseId);
  if (!course || !isCourseOwner(course, req.user)) throw ApiError.forbidden();

  const { title, description, durationMinutes, availableFrom, availableUntil, isPublished } =
    req.body;

  if (title !== undefined) quiz.title = title;
  if (description !== undefined) quiz.description = description;
  if (durationMinutes !== undefined) quiz.durationMinutes = Number(durationMinutes);
  if (availableFrom !== undefined) quiz.availableFrom = availableFrom;
  if (availableUntil !== undefined) quiz.availableUntil = availableUntil;
  if (isPublished !== undefined) quiz.isPublished = Boolean(isPublished);
  if (req.body.questions !== undefined) quiz.questions = normalizeQuestions(req.body.questions);

  await quiz.save();
  return ok(res, quiz.toObject({ virtuals: true }));
});

// DELETE /api/quizzes/:id
const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw ApiError.notFound('Quiz not found');

  const course = await Course.findById(quiz.courseId);
  if (!course || !isCourseOwner(course, req.user)) throw ApiError.forbidden();

  await Result.deleteMany({ quizId: quiz._id });
  await quiz.deleteOne();

  return ok(res, { message: 'Quiz deleted successfully' });
});

// POST /api/quizzes/:id/attempt  { answers: [{ questionIndex, selectedIndex }] }
const attemptQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw ApiError.notFound('Quiz not found');

  const { course } = await assertCourseAccess(quiz.courseId, req.user);
  if (req.user.role !== 'student') {
    throw ApiError.forbidden('Only students can attempt quizzes');
  }
  if (!quiz.isPublished) throw ApiError.badRequest('This quiz is not published yet');

  const now = new Date();
  if (quiz.availableFrom && now < new Date(quiz.availableFrom)) {
    throw ApiError.badRequest('This quiz is not open yet');
  }
  if (quiz.availableUntil && now > new Date(quiz.availableUntil)) {
    throw ApiError.badRequest('This quiz has closed');
  }

  const alreadyAttempted = await Result.findOne({ quizId: quiz._id, studentId: req.user._id });
  if (alreadyAttempted) throw ApiError.badRequest('You have already attempted this quiz');

  const submitted = Array.isArray(req.body.answers) ? req.body.answers : [];
  const selectedByIndex = new Map(
    submitted.map((a) => [Number(a.questionIndex), a.selectedIndex])
  );

  let score = 0;
  const answers = quiz.questions.map((question, index) => {
    const raw = selectedByIndex.get(index);
    const selectedIndex = raw === undefined || raw === null || raw === '' ? null : Number(raw);
    const isCorrect = selectedIndex === question.correctIndex;
    const marksAwarded = isCorrect ? question.marks : 0;
    score += marksAwarded;
    return {
      questionIndex: index,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
      marksAwarded,
    };
  });

  const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const result = await Result.create({
    quizId: quiz._id,
    courseId: quiz.courseId,
    studentId: req.user._id,
    score,
    totalMarks,
    percentage: totalMarks ? Math.round((score / totalMarks) * 100) : 0,
    answers,
  });

  await logActivity({
    userId: req.user._id,
    action: 'quiz.attempted',
    description: `Scored ${score}/${totalMarks} on "${quiz.title}"`,
    courseId: quiz.courseId,
    entityType: 'Result',
    entityId: result._id,
  });
  await notify({
    userId: course.teacherId,
    title: 'Quiz attempted',
    message: `${req.user.name} scored ${score}/${totalMarks} on "${quiz.title}"`,
    type: 'quiz',
    courseId: quiz.courseId,
    link: `/quizzes/${quiz._id}/results`,
  });

  return created(res, result);
});

// GET /api/quizzes/:id/results - students see only their own attempt.
const quizResults = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw ApiError.notFound('Quiz not found');

  const { course } = await assertCourseAccess(quiz.courseId, req.user);

  if (!isCourseOwner(course, req.user)) {
    const mine = await Result.find({ quizId: quiz._id, studentId: req.user._id });
    return ok(res, mine);
  }

  const results = await Result.find({ quizId: quiz._id })
    .populate('studentId', 'name email profileImage department semester')
    .sort({ percentage: -1, createdAt: 1 });

  return ok(res, results);
});

// GET /api/quizzes/results/my
const myResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ studentId: req.user._id })
    .populate('quizId', 'title durationMinutes')
    .populate('courseId', 'courseName')
    .sort({ createdAt: -1 });

  return ok(res, results);
});

module.exports = {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  attemptQuiz,
  quizResults,
  myResults,
};
