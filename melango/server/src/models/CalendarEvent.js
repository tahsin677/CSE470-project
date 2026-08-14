const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    eventDate: { type: Date, required: true, index: true },
    eventType: {
      type: String,
      enum: ['class', 'exam', 'assignment', 'quiz', 'holiday', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
