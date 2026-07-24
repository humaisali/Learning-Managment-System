const mongoose = require('mongoose');

const contentAssetSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherProfile', required: true },
  type: { 
    type: String, 
    enum: ['VIDEO', 'KEY_POINTS', 'SUBJECTIVE_QUESTION'],
    required: true
  },
  title: { type: String, required: true },
  fileUrl: { type: String },
  textContent: { type: String },
  duration: { type: Number },
  publishState: { 
    type: String, 
    enum: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'],
    default: 'DRAFT'
  },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

contentAssetSchema.index({ topicId: 1 });
contentAssetSchema.index({ publishState: 1 });

contentAssetSchema.virtual('engagementEvents', {
  ref: 'EngagementEvent',
  localField: '_id',
  foreignField: 'contentAssetId'
});

const ContentAsset = mongoose.model('ContentAsset', contentAssetSchema);
module.exports = ContentAsset;
