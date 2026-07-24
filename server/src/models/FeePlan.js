const mongoose = require('mongoose');

const feePlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  learningType: { 
    type: String, 
    enum: ['CURRICULUM', 'SKILL_BASED'],
    required: true
  },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'PKR' },
  durationDays: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

feePlanSchema.index({ learningType: 1, isActive: 1 });

feePlanSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'feePlanId'
});

const FeePlan = mongoose.model('FeePlan', feePlanSchema);
module.exports = FeePlan;
