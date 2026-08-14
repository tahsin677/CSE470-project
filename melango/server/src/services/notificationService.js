const Notification = require('../models/Notification');

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

module.exports = { notify, notifyMany };
