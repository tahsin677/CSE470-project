const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    type: {
      type: String,
      enum: [
        'assignment',
        'quiz',
        'announcement',
        'feedback',
        'message',
        'enrollment',
        'certificate',
        'payment',
        'deadline',
        'system',
      ],
      default: 'system',
    },
    link: { type: String, default: '' },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
