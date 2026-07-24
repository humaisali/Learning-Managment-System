const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

programSchema.virtual('modules', {
  ref: 'Module',
  localField: '_id',
  foreignField: 'programId'
});

programSchema.virtual('students', {
  ref: 'StudentProfile',
  localField: '_id',
  foreignField: 'programId'
});

programSchema.virtual('feePlans', {
  ref: 'FeePlan',
  localField: '_id',
  foreignField: 'programId'
});

const Program = mongoose.model('Program', programSchema);
module.exports = Program;
