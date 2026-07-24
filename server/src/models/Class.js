const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

classSchema.index({ boardId: 1, name: 1 }, { unique: true });

classSchema.virtual('subjects', {
  ref: 'Subject',
  localField: '_id',
  foreignField: 'classId'
});

classSchema.virtual('students', {
  ref: 'StudentProfile',
  localField: '_id',
  foreignField: 'classId'
});

classSchema.virtual('feePlans', {
  ref: 'FeePlan',
  localField: '_id',
  foreignField: 'classId'
});

const Class = mongoose.model('Class', classSchema);
module.exports = Class;
