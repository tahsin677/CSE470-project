const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['course', 'teacher', 'app'],
      default: 'course',
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

reviewSchema.index(
  { courseId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { targetType: 'course' } }
);
reviewSchema.index(
  { teacherId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { targetType: 'teacher' } }
);
reviewSchema.index(
  { studentId: 1, targetType: 1 },
  { unique: true, partialFilterExpression: { targetType: 'app' } }
);

reviewSchema.statics.recalculateCourseRating = async function recalc(courseId) {
  const [stats] = await this.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId), targetType: 'course' } },
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
