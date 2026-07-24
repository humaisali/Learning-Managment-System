const mongoose = require('mongoose');

const mcqSetSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  questions: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

mcqSetSchema.index({ topicId: 1 });

mcqSetSchema.virtual('attempts', {
  ref: 'MCQAttempt',
  localField: '_id',
  foreignField: 'mcqSetId'
});

const MCQSet = mongoose.model('MCQSet', mcqSetSchema);
module.exports = MCQSet;
