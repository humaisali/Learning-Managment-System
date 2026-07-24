const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  assignedTo: { type: String },
  resolution: { type: String }
}, {
  timestamps: true
});

complaintSchema.index({ status: 1 });
complaintSchema.index({ userId: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
