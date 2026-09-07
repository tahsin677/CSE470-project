const fs = require('fs');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Feedback = require('../models/Feedback');
const Course = require('../models/Course');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { fileMeta } = require('../middleware/upload');
const {
  assertCourseAccess,
  assertCourseOwner,
  isCourseOwner,
  getEnrolledStudentIds,
} = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');
const { notify, notifyMany } = require('../services/notificationService');
const emailService = require('../services/emailService');

function isDueSoon(dueDate, hours = 48) {
  const due = new Date(dueDate);
  const now = new Date();
  return due > now && due.getTime() - now.getTime() <= hours * 60 * 60 * 1000;
}

// GET /api/courses/:courseId/assignments
const listAssignments = asyncHandler(async (req, res) => {
  const { course } = await assertCourseAccess(req.params.courseId, req.user);

  const assignments = await Assignment.find({ courseId: course._id }).sort({ dueDate: 1 });

  if (req.user.role === 'student') {
    const submissions = await Submission.find({
      studentId: req.user._id,
      assignmentId: { $in: assignments.map((a) => a._id) },
    }).populate('feedbackId');
    const byAssignment = new Map(submissions.map((s) => [String(s.assignmentId), s]));

    const data = assignments.map((a) => ({
      ...a.toObject(),
      mySubmission: byAssignment.get(String(a._id)) || null,
      isOverdue: new Date(a.dueDate) < new Date() && !byAssignment.has(String(a._id)),
    }));
    return ok(res, data);
  }

  const counts = await Submission.aggregate([
    { $match: { assignmentId: { $in: assignments.map((a) => a._id) } } },
    {
      $group: {
        _id: '$assignmentId',
        total: { $sum: 1 },
        graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } },
      },
    },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c]));

  const data = assignments.map((a) => {
    const stat = countMap.get(String(a._id));
    return {
      ...a.toObject(),
      submissionCount: stat ? stat.total : 0,
      gradedCount: stat ? stat.graded : 0,
    };
  });
  return ok(res, data);
});

// GET /api/assignments/:id
const getAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id).populate('courseId', 'courseName');
  if (!assignment) throw ApiError.notFound('Assignment not found');

  await assertCourseAccess(assignment.courseId._id || assignment.courseId, req.user);

  let mySubmission = null;
  if (req.user.role === 'student') {
    mySubmission = await Submission.findOne({
      assignmentId: assignment._id,
      studentId: req.user._id,
    }).populate('feedbackId');
  }

  return ok(res, { ...assignment.toObject(), mySubmission });
});

// POST /api/courses/:courseId/assignments
const createAssignment = asyncHandler(async (req, res) => {
  const course = await assertCourseOwner(req.params.courseId, req.user);
  const { title, description, dueDate, totalMarks, allowResubmission } = req.body;

  if (!title) throw ApiError.badRequest('Title is required');
  if (!dueDate) throw ApiError.badRequest('Due date is required');

  const assignment = await Assignment.create({
    courseId: course._id,
    createdBy: req.user._id,
    title,
    description,
    dueDate,
    totalMarks: totalMarks !== undefined ? Number(totalMarks) : 100,
    allowResubmission: allowResubmission !== undefined ? Boolean(allowResubmission) : true,
  });

  const studentIds = await getEnrolledStudentIds(course._id);
  await notifyMany(studentIds, {
    title: 'New assignment posted',
    message: `"${assignment.title}" is due ${new Date(assignment.dueDate).toLocaleString()}`,
    type: 'assignment',
    courseId: course._id,
    link: '/app/assignments',
  });
  if (isDueSoon(assignment.dueDate)) {
    await notifyMany(studentIds, {
      title: 'Assignment deadline approaching',
      message: `"${assignment.title}" is due ${new Date(assignment.dueDate).toLocaleString()}`,
      type: 'deadline',
      courseId: course._id,
      link: `/assignments/${assignment._id}`,
    });
  }
  await logActivity({
    userId: req.user._id,
    action: 'assignment.created',
    description: `Posted assignment "${assignment.title}"`,
    courseId: course._id,
    entityType: 'Assignment',
    entityId: assignment._id,
  });

  return created(res, assignment);
});

// PUT /api/assignments/:id
const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const course = await Course.findById(assignment.courseId);
  if (!course || !isCourseOwner(course, req.user)) throw ApiError.forbidden();

  const { title, description, dueDate, totalMarks, allowResubmission } = req.body;
  const previousDue = assignment.dueDate;
  if (title !== undefined) assignment.title = title;
  if (description !== undefined) assignment.description = description;
  if (dueDate !== undefined) assignment.dueDate = dueDate;
  if (totalMarks !== undefined) assignment.totalMarks = Number(totalMarks);
  if (allowResubmission !== undefined) assignment.allowResubmission = Boolean(allowResubmission);
  await assignment.save();

  const dueChanged = dueDate !== undefined && new Date(previousDue).getTime() !== new Date(assignment.dueDate).getTime();
  if (dueChanged) {
    const studentIds = await getEnrolledStudentIds(course._id);
    await notifyMany(studentIds, {
      title: 'Assignment rescheduled',
      message: `"${assignment.title}" is now due ${new Date(assignment.dueDate).toLocaleString()}`,
      type: 'assignment',
      courseId: course._id,
      link: '/app/assignments',
    });
    if (isDueSoon(assignment.dueDate)) {
      await notifyMany(studentIds, {
        title: 'Assignment deadline approaching',
        message: `"${assignment.title}" is now due ${new Date(assignment.dueDate).toLocaleString()}`,
        type: 'deadline',
        courseId: course._id,
        link: `/assignments/${assignment._id}`,
      });
    }
  }

  return ok(res, assignment);
});

// DELETE /api/assignments/:id
const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const course = await Course.findById(assignment.courseId);
  if (!course || !isCourseOwner(course, req.user)) throw ApiError.forbidden();

  const submissions = await Submission.find({ assignmentId: assignment._id });
  submissions.forEach((s) => {
    if (s.filePath && fs.existsSync(s.filePath)) {
      fs.promises.unlink(s.filePath).catch(() => {});
    }
  });

  await Promise.all([
    Submission.deleteMany({ assignmentId: assignment._id }),
    Feedback.deleteMany({ assignmentId: assignment._id }),
  ]);
  await assignment.deleteOne();

  return ok(res, { message: 'Assignment deleted successfully' });
});

// POST /api/assignments/:id/submissions  (student, resubmit allowed before the deadline)
const submitAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const { course } = await assertCourseAccess(assignment.courseId, req.user);
  if (req.user.role !== 'student') {
    throw ApiError.forbidden('Only students can submit assignments');
  }

  const { text, link } = req.body;
  const meta = req.file ? fileMeta(req.file) : null;
  if (!meta && !text && !link) {
    throw ApiError.badRequest('Provide a file, text answer or link');
  }

  const isLate = new Date() > new Date(assignment.dueDate);
  const existing = await Submission.findOne({
    assignmentId: assignment._id,
    studentId: req.user._id,
  });

  if (existing) {
    if (existing.status === 'graded') {
      throw ApiError.badRequest('This submission has already been graded');
    }
    if (isLate && !assignment.allowResubmission) {
      throw ApiError.badRequest('The deadline has passed - resubmission is closed');
    }

    if (meta && existing.filePath && fs.existsSync(existing.filePath)) {
      fs.promises.unlink(existing.filePath).catch(() => {});
    }

    existing.text = text !== undefined ? text : existing.text;
    existing.link = link !== undefined ? link : existing.link;
    if (meta) {
      existing.fileName = meta.fileName;
      existing.originalName = meta.originalName;
      existing.filePath = meta.filePath;
      existing.fileUrl = meta.fileUrl;
    }
    existing.submittedAt = new Date();
    existing.attemptCount += 1;
    existing.status = isLate ? 'late' : 'submitted';
    await existing.save();

    return ok(res, existing);
  }

  const submission = await Submission.create({
    assignmentId: assignment._id,
    courseId: assignment.courseId,
    studentId: req.user._id,
    text: text || '',
    link: link || '',
    status: isLate ? 'late' : 'submitted',
    ...(meta || {}),
  });

  await logActivity({
    userId: req.user._id,
    action: 'assignment.submitted',
    description: `Submitted "${assignment.title}"`,
    courseId: assignment.courseId,
    entityType: 'Submission',
    entityId: submission._id,
  });
  await notify({
    userId: course.teacherId,
    title: 'New submission received',
    message: `${req.user.name} submitted "${assignment.title}"`,
    type: 'assignment',
    courseId: assignment.courseId,
    link: '/app/assignments',
  });

  return created(res, submission);
});

// GET /api/assignments/:id/submissions  (teacher/admin)
const listSubmissions = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const course = await Course.findById(assignment.courseId);
  if (!course || !isCourseOwner(course, req.user)) throw ApiError.forbidden();

  const submissions = await Submission.find({ assignmentId: assignment._id })
    .populate('studentId', 'name email profileImage department semester')
    .populate('feedbackId')
    .sort({ submittedAt: -1 });

  return ok(res, submissions);
});

// GET /api/submissions/my  (student)
const mySubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ studentId: req.user._id })
    .populate('assignmentId', 'title dueDate totalMarks')
    .populate('courseId', 'courseName')
    .populate('feedbackId')
    .sort({ submittedAt: -1 });

  return ok(res, submissions);
});

// GET /api/submissions/:id/download
const downloadSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw ApiError.notFound('Submission not found');

  const course = await Course.findById(submission.courseId);
  const isOwnSubmission = String(submission.studentId) === String(req.user._id);
  if (!isOwnSubmission && !(course && isCourseOwner(course, req.user))) {
    throw ApiError.forbidden();
  }

  if (!submission.filePath || !fs.existsSync(submission.filePath)) {
    throw ApiError.notFound('No file attached to this submission');
  }
  return res.download(submission.filePath, submission.originalName || submission.fileName);
});

// POST /api/submissions/:id/feedback  { marks, comments }
const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw ApiError.notFound('Submission not found');

  const course = await Course.findById(submission.courseId);
  if (!course || !isCourseOwner(course, req.user)) throw ApiError.forbidden();

  const assignment = await Assignment.findById(submission.assignmentId);
  const marks = Number(req.body.marks);
  if (Number.isNaN(marks) || marks < 0) throw ApiError.badRequest('Marks must be a positive number');
  if (assignment && marks > assignment.totalMarks) {
    throw ApiError.badRequest(`Marks cannot exceed ${assignment.totalMarks}`);
  }

  const feedback = await Feedback.findOneAndUpdate(
    { submissionId: submission._id },
    {
      submissionId: submission._id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      teacherId: req.user._id,
      marks,
      comments: req.body.comments || '',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  submission.feedbackId = feedback._id;
  submission.marks = marks;
  submission.status = 'graded';
  await submission.save();

  const student = await User.findById(submission.studentId);
  await notify({
    userId: submission.studentId,
    title: 'Assignment graded',
    message: `You scored ${marks}${assignment ? `/${assignment.totalMarks}` : ''} on "${
      assignment ? assignment.title : 'your assignment'
    }"`,
    type: 'feedback',
    courseId: submission.courseId,
    link: '/app/assignments',
  });
  await logActivity({
    userId: req.user._id,
    action: 'submission.graded',
    description: `Graded ${student ? student.name : 'a student'}'s submission`,
    courseId: submission.courseId,
    entityType: 'Feedback',
    entityId: feedback._id,
  });
  if (student && assignment) emailService.sendFeedbackEmail(student, assignment, marks);

  return created(res, feedback);
});

module.exports = {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  listSubmissions,
  mySubmissions,
  downloadSubmission,
  gradeSubmission,
};
