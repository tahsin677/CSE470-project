const Notification = require('../models/Notification');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { getAccessibleCourseIds } = require('./courseAccessService');

async function notify({ userId, title, message = '', type = 'system', link = '', courseId }) {
  try {
    return await Notification.create({ userId, title, message, type, link, courseId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notification] Failed to create:', err.message);
    return null;
  }
}

async function notifyMany(userIds, payload) {
  const unique = [...new Set((userIds || []).map((id) => String(id)))];
  if (!unique.length) return [];
  try {
    return await Notification.insertMany(
      unique.map((userId) => ({ ...payload, userId })),
      { ordered: false }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notification] Bulk create failed:', err.message);
    return [];
  }
}

// Create one reminder per upcoming assignment (due within 48 hours) if the
// student has not submitted yet. Safe to call on every inbox load.
async function ensureDeadlineReminders(user) {
  if (!user || user.role !== 'student') return;
  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const courseIds = await getAccessibleCourseIds(user);
  if (!courseIds.length) return;

  const assignments = await Assignment.find({
    courseId: { $in: courseIds },
    dueDate: { $gte: now, $lte: soon },
  }).select('title dueDate courseId');

  await Promise.all(
    assignments.map(async (assignment) => {
      const link = `/assignments/${assignment._id}`;
      const [submitted, existing] = await Promise.all([
        Submission.exists({ assignmentId: assignment._id, studentId: user._id }),
        Notification.findOne({ userId: user._id, type: 'deadline', link }),
      ]);
      if (submitted || existing) return;
      await notify({
        userId: user._id,
        title: 'Assignment deadline approaching',
        message: `"${assignment.title}" is due ${new Date(assignment.dueDate).toLocaleString()}`,
        type: 'deadline',
        courseId: assignment.courseId,
        link,
      });
    })
  );
}

module.exports = { notify, notifyMany, ensureDeadlineReminders };
