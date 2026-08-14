const Activity = require('../models/Activity');

// Fire-and-forget audit trail; failures are logged but never surface to the caller.
async function logActivity({ userId, action, description = '', courseId, entityType, entityId }) {
  try {
    return await Activity.create({
      userId,
      action,
      description,
      courseId,
      entityType,
      entityId,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[activity] Failed to log:', err.message);
    return null;
  }
}

module.exports = { logActivity };
