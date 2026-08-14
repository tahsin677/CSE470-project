const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const discussionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    replies: { type: [replySchema], default: [] },
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

discussionSchema.virtual('replyCount').get(function replyCount() {
  return (this.replies || []).length;
});

module.exports = mongoose.model('Discussion', discussionSchema);
