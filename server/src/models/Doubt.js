const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  text: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['NEW', 'ANSWERED', 'ESCALATED', 'CLOSED', 'LIVE_SESSION_RECOMMENDED'],
    default: 'NEW'
  },
  firstResponseAt: { type: Date },
  closedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

doubtSchema.index({ subjectId: 1, status: 1 });
doubtSchema.index({ studentId: 1 });

doubtSchema.virtual('responses', {
  ref: 'DoubtResponse',
  localField: '_id',
  foreignField: 'doubtId'
});

const Doubt = mongoose.model('Doubt', doubtSchema);
module.exports = Doubt;
