const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: { type: String, default: '' },
    link: { type: String, default: '' },
    fileName: { type: String, default: '' },
    originalName: { type: String, default: '' },
    filePath: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['submitted', 'late', 'graded'],
      default: 'submitted',
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    attemptCount: { type: Number, default: 1 },
    feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
    marks: { type: Number, default: null },
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
