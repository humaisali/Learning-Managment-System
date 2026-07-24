const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
  method: { 
    type: String, 
    enum: ['CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'],
    required: true
  },
  gatewayRef: { type: String, unique: true, sparse: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'PKR' },
  status: { 
    type: String, 
    enum: ['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED'],
    default: 'INITIATED'
  },
  failureReason: { type: String },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },
  verifiedBy: { type: String },
  confirmedAt: { type: Date }
}, {
  timestamps: true
});

paymentSchema.index({ status: 1 });
paymentSchema.index({ gatewayRef: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
