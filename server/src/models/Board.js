const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

boardSchema.virtual('classes', {
  ref: 'Class',
  localField: '_id',
  foreignField: 'boardId'
});

boardSchema.virtual('students', {
  ref: 'StudentProfile',
  localField: '_id',
  foreignField: 'boardId'
});

const Board = mongoose.model('Board', boardSchema);
module.exports = Board;
