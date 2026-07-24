const mongoose = require('mongoose');

const mcqAttemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  mcqSetId: { type: mongoose.Schema.Types.ObjectId, ref: 'MCQSet', required: true },
  answers: { type: mongoose.Schema.Types.Mixed, required: true },
  score: { type: Number, required: true }
}, {
  timestamps: true
});

mcqAttemptSchema.index({ studentId: 1 });

const MCQAttempt = mongoose.model('MCQAttempt', mcqAttemptSchema);
module.exports = MCQAttempt;
