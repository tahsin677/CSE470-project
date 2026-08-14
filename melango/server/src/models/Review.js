const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
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
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

// Keeps the denormalised rating fields on Course in sync.
reviewSchema.statics.recalculateCourseRating = async function recalc(courseId) {
  const [stats] = await this.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: '$courseId',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const Course = mongoose.model('Course');
  await Course.findByIdAndUpdate(courseId, {
    ratingAverage: stats ? Math.round(stats.average * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  });
};

module.exports = mongoose.model('Review', reviewSchema);
