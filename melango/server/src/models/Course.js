const mongoose = require('mongoose');
const { generateEnrollmentCode } = require('../utils/generateCode');

const courseSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General', index: true },
    enrollmentCode: { type: String, unique: true, uppercase: true, index: true },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    price: { type: Number, default: 0, min: 0 },
    isPremium: { type: Boolean, default: false },
    thumbnail: { type: String, default: '' },
    isPublished: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    studentCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

courseSchema.pre('validate', async function ensureCode(next) {
  if (this.enrollmentCode) return next();
  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateEnrollmentCode(6);
    const exists = await this.constructor.exists({ enrollmentCode: candidate });
    if (!exists) {
      this.enrollmentCode = candidate;
      return next();
    }
  }
  /* eslint-enable no-await-in-loop */
  return next(new Error('Could not generate a unique enrollment code'));
});

module.exports = mongoose.model('Course', courseSchema);
