const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

studentProfileSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'studentId'
});

studentProfileSchema.virtual('doubts', {
  ref: 'Doubt',
  localField: '_id',
  foreignField: 'studentId'
});

studentProfileSchema.virtual('engagementEvents', {
  ref: 'EngagementEvent',
  localField: '_id',
  foreignField: 'studentId'
});

studentProfileSchema.virtual('topicProgress', {
  ref: 'StudentTopicProgress',
  localField: '_id',
  foreignField: 'studentId'
});

studentProfileSchema.virtual('mcqAttempts', {
  ref: 'MCQAttempt',
  localField: '_id',
  foreignField: 'studentId'
});

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
module.exports = StudentProfile;
