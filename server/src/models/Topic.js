const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

topicSchema.index({ subjectId: 1 });

topicSchema.virtual('contentAssets', {
  ref: 'ContentAsset',
  localField: '_id',
  foreignField: 'topicId'
});

topicSchema.virtual('doubts', {
  ref: 'Doubt',
  localField: '_id',
  foreignField: 'topicId'
});

topicSchema.virtual('liveSessions', {
  ref: 'LiveSession',
  localField: '_id',
  foreignField: 'topicId'
});

topicSchema.virtual('mcqSets', {
  ref: 'MCQSet',
  localField: '_id',
  foreignField: 'topicId'
});

topicSchema.virtual('studentProgress', {
  ref: 'StudentTopicProgress',
  localField: '_id',
  foreignField: 'topicId'
});

const Topic = mongoose.model('Topic', topicSchema);
module.exports = Topic;
