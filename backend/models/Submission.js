const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answerText: {
    type: String,
    default: '',
  },
  fileUrl: {
    type: String,
    default: '',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  // AI Grading
  aiScore: { type: Number, default: null },
  aiGrade: { type: String, default: '' },
  aiRemarks: { type: String, default: '' },
  // Tutor Confirmed Grade
  finalScore: { type: Number, default: null },
  finalGrade: { type: String, default: '' },
  finalRemarks: { type: String, default: '' },
  tutorConfirmed: { type: Boolean, default: false },
  // Status: pending → ai_graded → confirmed
  status: {
    type: String,
    enum: ['pending', 'ai_graded', 'confirmed'],
    default: 'pending',
  },
});

module.exports = mongoose.model('Submission', submissionSchema);
