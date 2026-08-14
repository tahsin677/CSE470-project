const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedIndex: { type: Number, default: null },
    correctIndex: { type: Number },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    answers: { type: [answerSchema], default: [] },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

resultSchema.index({ quizId: 1, studentId: 1 });

module.exports = mongoose.model('Result', resultSchema);
