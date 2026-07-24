const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherProfile', required: true },
  status: { 
    type: String, 
    enum: ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  scheduledAt: { type: Date },
  startedAt: { type: Date },
  endedAt: { type: Date },
  muxStreamKey: { type: String },
  muxPlaybackId: { type: String },
  recordingUrl: { type: String },
  participantCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

liveSessionSchema.index({ topicId: 1 });
liveSessionSchema.index({ status: 1 });

const LiveSession = mongoose.model('LiveSession', liveSessionSchema);
module.exports = LiveSession;
