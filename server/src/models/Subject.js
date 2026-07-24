const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

subjectSchema.index({ classId: 1 });
subjectSchema.index({ moduleId: 1 });

subjectSchema.virtual('topics', {
  ref: 'Topic',
  localField: '_id',
  foreignField: 'subjectId'
});

subjectSchema.virtual('teacherSubjects', {
  ref: 'TeacherSubject',
  localField: '_id',
  foreignField: 'subjectId'
});

subjectSchema.virtual('doubts', {
  ref: 'Doubt',
  localField: '_id',
  foreignField: 'subjectId'
});

const Subject = mongoose.model('Subject', subjectSchema);
module.exports = Subject;
