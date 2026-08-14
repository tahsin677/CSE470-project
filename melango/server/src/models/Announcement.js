const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    isGlobal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
