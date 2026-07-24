const mongoose = require('mongoose');

const teacherProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  teacherType: { type: String, required: true } // 'CENTRAL' or 'SUBJECT'
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

teacherProfileSchema.virtual('subjects', {
  ref: 'TeacherSubject',
  localField: '_id',
  foreignField: 'teacherId'
});

teacherProfileSchema.virtual('uploadedContent', {
  ref: 'ContentAsset',
  localField: '_id',
  foreignField: 'teacherId'
});

teacherProfileSchema.virtual('doubtResponses', {
  ref: 'DoubtResponse',
  localField: '_id',
  foreignField: 'teacherId'
});

teacherProfileSchema.virtual('liveSessions', {
  ref: 'LiveSession',
  localField: '_id',
  foreignField: 'teacherId'
});

const TeacherProfile = mongoose.model('TeacherProfile', teacherProfileSchema);
module.exports = TeacherProfile;
