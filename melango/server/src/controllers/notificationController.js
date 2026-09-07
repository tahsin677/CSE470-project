const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { ensureDeadlineReminders } = require('../services/notificationService');

// GET /api/notifications?unread=true&limit=
const listNotifications = asyncHandler(async (req, res) => {
  await ensureDeadlineReminders(req.user);
  const filter = { userId: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  return ok(res, { notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!notification) throw ApiError.notFound('Notification not found');

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return ok(res, notification);
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return ok(res, { updated: result.modifiedCount || 0 });
});

// DELETE /api/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!notification) throw ApiError.notFound('Notification not found');
  return ok(res, { message: 'Notification deleted' });
});

module.exports = { listNotifications, markRead, markAllRead, deleteNotification };
