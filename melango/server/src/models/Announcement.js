const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

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
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
