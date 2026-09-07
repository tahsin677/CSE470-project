const CalendarEvent = require('../models/CalendarEvent');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const {
  getAccessibleCourseIds,
  assertCourseAccess,
  isCourseOwner,
} = require('../services/courseAccessService');

// GET /api/calendar?courseId=&from=&to=
// Combines stored events with deadlines derived from assignments and quizzes.
const listEvents = asyncHandler(async (req, res) => {
  const { courseId, from, to } = req.query;

  let courseIds;
  if (courseId) {
    await assertCourseAccess(courseId, req.user);
    courseIds = [courseId];
  } else {
    courseIds = await getAccessibleCourseIds(req.user);
  }

  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const storedQuery = courseId
    ? { courseId }
    : { $or: [{ courseId: { $in: courseIds } }, { courseId: null }] };
  if (hasDateFilter) storedQuery.eventDate = dateFilter;

  const assignmentQuery = { courseId: { $in: courseIds } };
  if (hasDateFilter) assignmentQuery.dueDate = dateFilter;

  const quizQuery = { courseId: { $in: courseIds }, availableUntil: { $ne: null } };
  if (hasDateFilter) quizQuery.availableUntil = dateFilter;

  const [stored, assignments, quizzes, courses] = await Promise.all([
    CalendarEvent.find(storedQuery).populate('courseId', 'courseName').sort({ eventDate: 1 }),
    Assignment.find(assignmentQuery).populate('courseId', 'courseName'),
    Quiz.find(quizQuery).populate('courseId', 'courseName'),
    Course.find({ _id: { $in: courseIds } }).select('courseName'),
  ]);

  const courseNames = new Map(courses.map((c) => [String(c._id), c.courseName]));

  const derived = [
    ...assignments.map((a) => ({
      _id: `assignment-${a._id}`,
      title: a.title,
      description: a.description,
      eventDate: a.dueDate,
      eventType: 'assignment',
      courseId: a.courseId,
      courseName: a.courseId?.courseName || courseNames.get(String(a.courseId)) || '',
      source: 'assignment',
      sourceId: a._id,
    })),
    ...quizzes.map((q) => ({
      _id: `quiz-${q._id}`,
      title: q.title,
      description: q.description,
      eventDate: q.availableUntil,
      eventType: 'quiz',
      courseId: q.courseId,
      courseName: q.courseId?.courseName || courseNames.get(String(q.courseId)) || '',
      source: 'quiz',
      sourceId: q._id,
    })),
  ];

  const storedMapped = stored.map((e) => ({
    ...e.toObject(),
    courseName: e.courseId?.courseName || '',
    source: 'event',
    sourceId: e._id,
  }));

  const events = [...storedMapped, ...derived].sort(
    (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
  );

  return ok(res, events);
});

// POST /api/calendar  { courseId, title, eventDate, eventType }
const createEvent = asyncHandler(async (req, res) => {
  const { courseId, title, eventDate, eventType, description } = req.body;

  if (!title) throw ApiError.badRequest('Title is required');
  if (!eventDate) throw ApiError.badRequest('Event date is required');

  if (courseId) {
    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found');
    if (!isCourseOwner(course, req.user)) {
      throw ApiError.forbidden('You can only add events to your own courses');
    }
  } else if (req.user.role === 'student') {
    // Students may add personal reminders that are not tied to a course.
  }

  const event = await CalendarEvent.create({
    courseId: courseId || null,
    createdBy: req.user._id,
    title,
    description: description || '',
    eventDate,
    eventType: eventType || 'other',
  });

  const populated = await event.populate('courseId', 'courseName');
  return created(res, populated);
});

// PUT /api/calendar/:id
const updateEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');

  const isAuthor = String(event.createdBy) === String(req.user._id);
  if (!isAuthor && req.user.role !== 'admin') throw ApiError.forbidden();

  const { title, eventDate, eventType, description } = req.body;
  if (title !== undefined) event.title = title;
  if (eventDate !== undefined) event.eventDate = eventDate;
  if (eventType !== undefined) event.eventType = eventType;
  if (description !== undefined) event.description = description;
  await event.save();

  return ok(res, event);
});

// DELETE /api/calendar/:id
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');

  const isAuthor = String(event.createdBy) === String(req.user._id);
  if (!isAuthor && req.user.role !== 'admin') throw ApiError.forbidden();

  await event.deleteOne();
  return ok(res, { message: 'Event deleted successfully' });
});

module.exports = { listEvents, createEvent, updateEvent, deleteEvent };
