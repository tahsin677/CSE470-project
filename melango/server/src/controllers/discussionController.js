const Discussion = require('../models/Discussion');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { assertCourseAccess, isCourseOwner } = require('../services/courseAccessService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

const AUTHOR_FIELDS = 'name role profileImage';

// GET /api/courses/:courseId/discussions
const listDiscussions = asyncHandler(async (req, res) => {
  await assertCourseAccess(req.params.courseId, req.user);

  const discussions = await Discussion.find({ courseId: req.params.courseId })
    .populate('userId', AUTHOR_FIELDS)
    .populate('replies.userId', AUTHOR_FIELDS)
    .sort({ updatedAt: -1 });

  return ok(res, discussions);
});

// POST /api/courses/:courseId/discussions  { topic, message }
const createDiscussion = asyncHandler(async (req, res) => {
  const { course } = await assertCourseAccess(req.params.courseId, req.user);
  const { topic, message } = req.body;
  if (!topic || !message) throw ApiError.badRequest('Topic and message are required');

  const discussion = await Discussion.create({
    courseId: course._id,
    userId: req.user._id,
    topic,
    message,
  });

  if (String(course.teacherId) !== String(req.user._id)) {
    await notify({
      userId: course.teacherId,
      title: 'New discussion thread',
      message: `${req.user.name} asked: "${topic}"`,
      type: 'announcement',
      courseId: course._id,
      link: `/courses/${course._id}/discussions`,
    });
  }
  await logActivity({
    userId: req.user._id,
    action: 'discussion.created',
    description: `Started discussion "${topic}"`,
    courseId: course._id,
    entityType: 'Discussion',
    entityId: discussion._id,
  });

  const populated = await discussion.populate('userId', AUTHOR_FIELDS);
  return created(res, populated);
});

// GET /api/discussions/:id
const getDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id)
    .populate('userId', AUTHOR_FIELDS)
    .populate('replies.userId', AUTHOR_FIELDS);
  if (!discussion) throw ApiError.notFound('Discussion not found');

  await assertCourseAccess(discussion.courseId, req.user);
  return ok(res, discussion);
});

// POST /api/discussions/:id/reply  { message }
const replyToDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion) throw ApiError.notFound('Discussion not found');

  const { course } = await assertCourseAccess(discussion.courseId, req.user);
  const { message } = req.body;
  if (!message) throw ApiError.badRequest('Reply message is required');

  discussion.replies.push({ userId: req.user._id, message });
  await discussion.save();

  // Notify the thread author and the instructor, skipping the replier.
  const recipients = new Set([String(discussion.userId), String(course.teacherId)]);
  recipients.delete(String(req.user._id));
  await Promise.all(
    [...recipients].map((userId) =>
      notify({
        userId,
        title: 'New reply in discussion',
        message: `${req.user.name} replied to "${discussion.topic}"`,
        type: 'announcement',
        courseId: discussion.courseId,
        link: `/courses/${discussion.courseId}/discussions`,
      })
    )
  );

  const populated = await Discussion.findById(discussion._id)
    .populate('userId', AUTHOR_FIELDS)
    .populate('replies.userId', AUTHOR_FIELDS);
  return created(res, populated);
});

// DELETE /api/discussions/:id
const deleteDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion) throw ApiError.notFound('Discussion not found');

  const { course } = await assertCourseAccess(discussion.courseId, req.user);
  const isAuthor = String(discussion.userId) === String(req.user._id);
  if (!isAuthor && !isCourseOwner(course, req.user)) {
    throw ApiError.forbidden('You can only delete your own threads');
  }

  await discussion.deleteOne();
  return ok(res, { message: 'Discussion deleted successfully' });
});

module.exports = {
  listDiscussions,
  createDiscussion,
  getDiscussion,
  replyToDiscussion,
  deleteDiscussion,
};
