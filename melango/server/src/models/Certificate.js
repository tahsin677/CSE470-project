const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
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
    certificateCode: { type: String, required: true, unique: true, index: true },
    studentName: { type: String, default: '' },
    courseName: { type: String, default: '' },
    issuedAt: { type: Date, default: Date.now },
    completionPercentage: { type: Number, default: 100 },
    fileName: { type: String, default: '' },
    filePath: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

certificateSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
