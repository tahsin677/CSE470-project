const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
    },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    marks: { type: Number, required: true, min: 0 },
    comments: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
