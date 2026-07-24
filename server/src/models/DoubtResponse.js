const mongoose = require('mongoose');

const doubtResponseSchema = new mongoose.Schema({
  doubtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherProfile', required: true },
  text: { type: String },
  clipUrl: { type: String }
}, {
  timestamps: true
});

const DoubtResponse = mongoose.model('DoubtResponse', doubtResponseSchema);
module.exports = DoubtResponse;
