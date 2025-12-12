const mongoose = require('mongoose');

const ExamScheduleSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  subject: { type: String, required: true },
  examDate: { type: Date, required: true },
  examTime: { type: String, required: true }, // e.g., "10:00 AM - 12:00 PM"
  location: { type: String, required: true },
  examType: { type: String, enum: ['midterm', 'final', 'quiz', 'practical'], default: 'midterm' },
  totalMarks: { type: Number, required: true },
  duration: { type: String, required: true }, // e.g., "2 hours"
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ExamSchedule', ExamScheduleSchema);
