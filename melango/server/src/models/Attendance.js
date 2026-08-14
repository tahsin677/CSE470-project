const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    date: { type: Date, required: true, index: true },
    records: { type: [recordSchema], default: [] },
  },
  { timestamps: true }
);

attendanceSchema.index({ courseId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
