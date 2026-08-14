const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { assertCourseOwner, assertCourseAccess } = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');

const VALID_STATUS = ['present', 'absent', 'late', 'excused'];

function startOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Invalid date');
  date.setHours(0, 0, 0, 0);
  return date;
}

// POST /api/courses/:courseId/attendance  { date, records: [{ studentId, status }] }
const takeAttendance = asyncHandler(async (req, res) => {
  const course = await assertCourseOwner(req.params.courseId, req.user);
  const { date, records } = req.body;

  if (!date) throw ApiError.badRequest('Date is required');
  if (!Array.isArray(records) || records.length === 0) {
    throw ApiError.badRequest('At least one attendance record is required');
  }

  const enrolled = await Enrollment.find({ courseId: course._id }).select('studentId');
  const enrolledIds = new Set(enrolled.map((e) => String(e.studentId)));

  const cleanRecords = records.map((r) => {
    if (!enrolledIds.has(String(r.studentId))) {
      throw ApiError.badRequest('One of the students is not enrolled in this course');
    }
    if (r.status && !VALID_STATUS.includes(r.status)) {
      throw ApiError.badRequest(`Status must be one of: ${VALID_STATUS.join(', ')}`);
    }
    return { studentId: r.studentId, status: r.status || 'present' };
  });

  // One attendance sheet per course per day; re-posting replaces the sheet.
  const attendance = await Attendance.findOneAndUpdate(
    { courseId: course._id, date: startOfDay(date) },
    { courseId: course._id, date: startOfDay(date), takenBy: req.user._id, records: cleanRecords },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('records.studentId', 'name email profileImage');

  await logActivity({
    userId: req.user._id,
    action: 'attendance.recorded',
    description: `Recorded attendance for ${course.courseName}`,
    courseId: course._id,
    entityType: 'Attendance',
    entityId: attendance._id,
  });

  return created(res, attendance);
});

// GET /api/courses/:courseId/attendance
const courseAttendance = asyncHandler(async (req, res) => {
  const { course } = await assertCourseAccess(req.params.courseId, req.user);

  const sheets = await Attendance.find({ courseId: course._id })
    .populate('records.studentId', 'name email profileImage')
    .sort({ date: -1 });

  // Students only see their own row on each sheet.
  if (req.user.role === 'student') {
    const data = sheets.map((sheet) => {
      const mine = sheet.records.find(
        (r) => String(r.studentId?._id || r.studentId) === String(req.user._id)
      );
      return {
        _id: sheet._id,
        courseId: sheet.courseId,
        date: sheet.date,
        status: mine ? mine.status : 'absent',
      };
    });
    return ok(res, data);
  }

  return ok(res, sheets);
});

// GET /api/attendance/my - per-course attendance summary for the student.
const myAttendance = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ studentId: req.user._id }).select('courseId');
  const courseIds = enrollments.map((e) => e.courseId);

  const sheets = await Attendance.find({ courseId: { $in: courseIds } })
    .populate('courseId', 'courseName')
    .sort({ date: -1 });

  const summary = new Map();
  const entries = [];

  sheets.forEach((sheet) => {
    const mine = sheet.records.find((r) => String(r.studentId) === String(req.user._id));
    if (!mine) return;

    const key = String(sheet.courseId?._id || sheet.courseId);
    if (!summary.has(key)) {
      summary.set(key, {
        courseId: sheet.courseId,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      });
    }
    const stat = summary.get(key);
    stat.total += 1;
    stat[mine.status] += 1;

    entries.push({
      _id: sheet._id,
      course: sheet.courseId,
      date: sheet.date,
      status: mine.status,
    });
  });

  const courses = [...summary.values()].map((stat) => ({
    ...stat,
    attendancePercentage: stat.total
      ? Math.round(((stat.present + stat.late + stat.excused) / stat.total) * 100)
      : 0,
  }));

  return ok(res, { records: entries, summary: courses });
});

module.exports = { takeAttendance, courseAttendance, myAttendance };
