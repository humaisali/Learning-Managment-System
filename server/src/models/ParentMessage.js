const mongoose = require('mongoose');

const parentMessageSchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherProfile', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  message: { type: String, required: true },
  isFromParent: { type: Boolean, required: true }
}, {
  timestamps: true
});

parentMessageSchema.index({ parentId: 1, teacherId: 1, subjectId: 1 });

const ParentMessage = mongoose.model('ParentMessage', parentMessageSchema);
module.exports = ParentMessage;
