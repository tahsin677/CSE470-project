const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
    action: { type: String, required: true },
    description: { type: String, default: '' },
    entityType: { type: String, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
