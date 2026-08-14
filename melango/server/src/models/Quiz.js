const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: {
      type: [String],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: 'A question needs at least two options',
      },
    },
    correctIndex: { type: Number, required: true, min: 0 },
    marks: { type: Number, default: 1, min: 0 },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 15, min: 1 },
    availableFrom: { type: Date },
    availableUntil: { type: Date, index: true },
    isPublished: { type: Boolean, default: true },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

quizSchema.virtual('totalMarks').get(function totalMarks() {
  return (this.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);
});

quizSchema.virtual('questionCount').get(function questionCount() {
  return (this.questions || []).length;
});

// Strips correctIndex so students never receive the answer key.
quizSchema.methods.toStudentView = function toStudentView() {
  const obj = this.toObject({ virtuals: true });
  obj.questions = (obj.questions || []).map((q) => ({
    _id: q._id,
    questionText: q.questionText,
    options: q.options,
    marks: q.marks,
  }));
  return obj;
};

module.exports = mongoose.model('Quiz', quizSchema);
