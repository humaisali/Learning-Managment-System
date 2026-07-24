const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone: { type: String, required: true },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date }
}, {
  timestamps: true
});

otpCodeSchema.index({ phone: 1, code: 1 });

const OTPCode = mongoose.model('OTPCode', otpCodeSchema);
module.exports = OTPCode;
