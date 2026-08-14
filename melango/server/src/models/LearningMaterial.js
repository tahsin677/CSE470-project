const mongoose = require('mongoose');

const learningMaterialSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    fileType: {
      type: String,
      enum: ['pdf', 'video', 'slide', 'image', 'link', 'other'],
      default: 'other',
    },
    fileName: { type: String, default: '' },
    originalName: { type: String, default: '' },
    filePath: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningMaterial', learningMaterialSchema);
