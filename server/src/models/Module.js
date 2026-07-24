const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

moduleSchema.index({ programId: 1, name: 1 }, { unique: true });

moduleSchema.virtual('subjects', {
  ref: 'Subject',
  localField: '_id',
  foreignField: 'moduleId'
});

const Module = mongoose.model('Module', moduleSchema);
module.exports = Module;
