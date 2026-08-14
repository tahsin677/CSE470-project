const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
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
    completedMaterials: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'LearningMaterial' },
    ],
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

progressSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
