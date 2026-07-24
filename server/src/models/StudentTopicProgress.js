const mongoose = require('mongoose');

const studentTopicProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  status: { 
    type: String, 
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'NOT_STARTED'
  },
  watchedSeconds: { type: Number, default: 0 },
  totalSeconds: { type: Number, default: 0 },
  completedAt: { type: Date }
}, {
  timestamps: true
});

studentTopicProgressSchema.index({ studentId: 1, topicId: 1 }, { unique: true });

const StudentTopicProgress = mongoose.model('StudentTopicProgress', studentTopicProgressSchema);
module.exports = StudentTopicProgress;
