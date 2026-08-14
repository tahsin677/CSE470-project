const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const Announcement = require('../models/Announcement');
const Activity = require('../models/Activity');
const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');
const Payment = require('../models/Payment');
const LearningMaterial = require('../models/LearningMaterial');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');

const UPCOMING_WINDOW_DAYS = 14;

function windowEnd() {
  const end = new Date();
  end.setDate(end.getDate() + UPCOMING_WINDOW_DAYS);
  return end;
}

async function recentActivityFor(userIds, courseIds, limit = 10) {
  const filter = [];
  if (userIds?.length) filter.push({ userId: { $in: userIds } });
  if (courseIds?.length) filter.push({ courseId: { $in: courseIds } });

  const query = filter.length ? { $or: filter } : {};
  return Activity.find(query)
    .populate('userId', 'name role profileImage')
    .populate('courseId', 'courseName')
    .sort({ createdAt: -1 })
    .limit(limit);
}

async function studentDashboard(user) {
  const now = new Date();

  const enrollments = await Enrollment.find({ studentId: user._id }).populate(
    'courseId',
    'courseName category thumbnail'
  );
  const courseIds = enrollments.filter((e) => e.courseId).map((e) => e.courseId._id);

  const [
    submissions,
    assignments,
    quizzes,
    results,
    progressRecords,
    certificateCount,
    announcements,
    activity,
  ] = await Promise.all([
    Submission.find({ studentId: user._id }),
    Assignment.find({ courseId: { $in: courseIds } })
      .populate('courseId', 'courseName')
      .sort({ dueDate: 1 }),
    Quiz.find({ courseId: { $in: courseIds } }).populate('courseId', 'courseName'),
    Result.find({ studentId: user._id }),
    Progress.find({ studentId: user._id }),
    Certificate.countDocuments({ studentId: user._id }),
    Announcement.find({ $or: [{ courseId: { $in: courseIds } }, { courseId: null }] })
      .populate('courseId', 'courseName')
      .populate('postedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(5),
    recentActivityFor([user._id], courseIds),
  ]);

  const submittedAssignmentIds = new Set(submissions.map((s) => String(s.assignmentId)));
  const attemptedQuizIds = new Set(results.map((r) => String(r.quizId)));

  const pendingAssignments = assignments.filter(
    (a) => !submittedAssignmentIds.has(String(a._id))
  );
  const overdueCount = pendingAssignments.filter((a) => new Date(a.dueDate) < now).length;

  const upcomingDeadlines = [
    ...pendingAssignments
      .filter((a) => new Date(a.dueDate) >= now && new Date(a.dueDate) <= windowEnd())
      .map((a) => ({
        _id: a._id,
        type: 'assignment',
        title: a.title,
        courseName: a.courseId?.courseName || '',
        courseId: a.courseId?._id || a.courseId,
        dueDate: a.dueDate,
      })),
    ...quizzes
      .filter(
        (q) =>
          q.availableUntil &&
          !attemptedQuizIds.has(String(q._id)) &&
          new Date(q.availableUntil) >= now &&
          new Date(q.availableUntil) <= windowEnd()
      )
      .map((q) => ({
        _id: q._id,
        type: 'quiz',
        title: q.title,
        courseName: q.courseId?.courseName || '',
        courseId: q.courseId?._id || q.courseId,
        dueDate: q.availableUntil,
      })),
  ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const gradedSubmissions = submissions.filter((s) => s.status === 'graded' && s.marks !== null);
  const averageGrade = gradedSubmissions.length
    ? Math.round(
        gradedSubmissions.reduce((sum, s) => sum + s.marks, 0) / gradedSubmissions.length
      )
    : 0;
  const averageQuizScore = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;
  const overallProgress = progressRecords.length
    ? Math.round(
        progressRecords.reduce((sum, p) => sum + p.completionPercentage, 0) /
          progressRecords.length
      )
    : 0;

  return {
    role: 'student',
    kpis: {
      enrolledCourses: enrollments.length,
      completedCourses: enrollments.filter((e) => e.status === 'completed').length,
      pendingAssignments: pendingAssignments.length,
      overdueAssignments: overdueCount,
      submittedAssignments: submissions.length,
      quizzesTaken: results.length,
      averageGrade,
      averageQuizScore,
      overallProgress,
      certificates: certificateCount,
    },
    upcomingDeadlines: upcomingDeadlines.slice(0, 10),
    recentActivity: activity,
    announcements,
    courseProgress: progressRecords.map((p) => {
      const enrollment = enrollments.find(
        (e) => e.courseId && String(e.courseId._id) === String(p.courseId)
      );
      return {
        courseId: p.courseId,
        courseName: enrollment?.courseId?.courseName || '',
        completionPercentage: p.completionPercentage,
      };
    }),
  };
}

async function teacherDashboard(user) {
  const now = new Date();

  const courses = await Course.find({ teacherId: user._id });
  const courseIds = courses.map((c) => c._id);

  const [
    studentCount,
    assignments,
    quizzes,
    materialCount,
    submissions,
    results,
    activity,
    progressRecords,
  ] = await Promise.all([
    Enrollment.countDocuments({ courseId: { $in: courseIds } }),
    Assignment.find({ courseId: { $in: courseIds } })
      .populate('courseId', 'courseName')
      .sort({ dueDate: 1 }),
    Quiz.find({ courseId: { $in: courseIds } }).populate('courseId', 'courseName'),
    LearningMaterial.countDocuments({ courseId: { $in: courseIds } }),
    Submission.find({ courseId: { $in: courseIds } }),
    Result.find({ courseId: { $in: courseIds } }),
    recentActivityFor(null, courseIds),
    Progress.find({ courseId: { $in: courseIds } }),
  ]);

  const pendingGrading = submissions.filter((s) => s.status !== 'graded').length;

  const upcomingDeadlines = [
    ...assignments
      .filter((a) => new Date(a.dueDate) >= now && new Date(a.dueDate) <= windowEnd())
      .map((a) => ({
        _id: a._id,
        type: 'assignment',
        title: a.title,
        courseName: a.courseId?.courseName || '',
        courseId: a.courseId?._id || a.courseId,
        dueDate: a.dueDate,
      })),
    ...quizzes
      .filter(
        (q) =>
          q.availableUntil &&
          new Date(q.availableUntil) >= now &&
          new Date(q.availableUntil) <= windowEnd()
      )
      .map((q) => ({
        _id: q._id,
        type: 'quiz',
        title: q.title,
        courseName: q.courseId?.courseName || '',
        courseId: q.courseId?._id || q.courseId,
        dueDate: q.availableUntil,
      })),
  ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const averageQuizScore = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;
  const averageProgress = progressRecords.length
    ? Math.round(
        progressRecords.reduce((sum, p) => sum + p.completionPercentage, 0) /
          progressRecords.length
      )
    : 0;
  const averageRating = courses.length
    ? Math.round(
        (courses.reduce((sum, c) => sum + (c.ratingAverage || 0), 0) / courses.length) * 10
      ) / 10
    : 0;

  return {
    role: 'teacher',
    kpis: {
      totalCourses: courses.length,
      totalStudents: studentCount,
      totalAssignments: assignments.length,
      totalQuizzes: quizzes.length,
      totalMaterials: materialCount,
      totalSubmissions: submissions.length,
      pendingGrading,
      averageQuizScore,
      averageProgress,
      averageRating,
    },
    upcomingDeadlines: upcomingDeadlines.slice(0, 10),
    recentActivity: activity,
    courses: courses.map((c) => ({
      _id: c._id,
      courseName: c.courseName,
      category: c.category,
      studentCount: c.studentCount,
      enrollmentCode: c.enrollmentCode,
      ratingAverage: c.ratingAverage,
    })),
  };
}

async function adminDashboard() {
  const [
    userCounts,
    courseCount,
    enrollmentCount,
    assignmentCount,
    quizCount,
    submissionCount,
    certificateCount,
    payments,
    activity,
    topCourses,
    recentUsers,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    Assignment.countDocuments(),
    Quiz.countDocuments(),
    Submission.countDocuments(),
    Certificate.countDocuments(),
    Payment.find({ status: 'paid' }),
    recentActivityFor(null, null, 15),
    Course.find()
      .sort({ studentCount: -1 })
      .limit(5)
      .populate('teacherId', 'name')
      .select('courseName studentCount ratingAverage category'),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
  ]);

  const roleMap = userCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const upcoming = await Assignment.find({ dueDate: { $gte: new Date(), $lte: windowEnd() } })
    .populate('courseId', 'courseName')
    .sort({ dueDate: 1 })
    .limit(10);

  return {
    role: 'admin',
    kpis: {
      totalUsers: (roleMap.student || 0) + (roleMap.teacher || 0) + (roleMap.admin || 0),
      students: roleMap.student || 0,
      teachers: roleMap.teacher || 0,
      admins: roleMap.admin || 0,
      totalCourses: courseCount,
      totalEnrollments: enrollmentCount,
      totalAssignments: assignmentCount,
      totalQuizzes: quizCount,
      totalSubmissions: submissionCount,
      certificatesIssued: certificateCount,
      totalRevenue,
      paidPayments: payments.length,
    },
    upcomingDeadlines: upcoming.map((a) => ({
      _id: a._id,
      type: 'assignment',
      title: a.title,
      courseName: a.courseId?.courseName || '',
      courseId: a.courseId?._id || a.courseId,
      dueDate: a.dueDate,
    })),
    recentActivity: activity,
    topCourses,
    recentUsers,
  };
}

// GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === 'student') data = await studentDashboard(req.user);
  else if (req.user.role === 'teacher') data = await teacherDashboard(req.user);
  else data = await adminDashboard();

  return ok(res, data);
});

// GET /api/dashboard/activity
const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  if (req.user.role === 'admin') {
    const activity = await recentActivityFor(null, null, limit);
    return ok(res, activity);
  }

  const courses =
    req.user.role === 'teacher'
      ? await Course.find({ teacherId: req.user._id }).select('_id')
      : await Enrollment.find({ studentId: req.user._id }).select('courseId');

  const courseIds = courses.map((c) => c.courseId || c._id);
  const activity = await recentActivityFor([req.user._id], courseIds, limit);
  return ok(res, activity);
});

module.exports = { getStats, getActivity };
