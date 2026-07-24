const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  feePlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeePlan', required: true },
  learningType: { 
    type: String, 
    enum: ['CURRICULUM', 'SKILL_BASED'],
    required: true
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING'
  },
  startDate: { type: Date },
  endDate: { type: Date },
  activatedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

enrollmentSchema.index({ studentId: 1 });
enrollmentSchema.index({ status: 1 });

enrollmentSchema.virtual('payment', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'enrollmentId',
  justOne: true
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;
