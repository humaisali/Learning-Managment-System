const mongoose = require('mongoose');

const engagementEventSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  contentAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentAsset' },
  eventType: { 
    type: String, 
    enum: ['WATCH_HEARTBEAT', 'VIDEO_COMPLETE', 'MCQ_ATTEMPT', 'DOUBT_SUBMITTED', 'SESSION_LOGIN'],
    required: true
  },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

engagementEventSchema.index({ studentId: 1, eventType: 1 });
engagementEventSchema.index({ createdAt: 1 });

const EngagementEvent = mongoose.model('EngagementEvent', engagementEventSchema);
module.exports = EngagementEvent;
