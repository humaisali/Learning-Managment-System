const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  fullName: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['STUDENT', 'PARENT', 'CENTRAL_TEACHER', 'SUBJECT_TEACHER', 'HEAD_OFFICE', 'SYSTEM_ADMIN'],
    required: true
  },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspendReason: { type: String },
  lastLoginAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('studentProfile', {
  ref: 'StudentProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

userSchema.virtual('teacherProfile', {
  ref: 'TeacherProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

userSchema.virtual('parentLinksAsParent', {
  ref: 'ParentLink',
  localField: '_id',
  foreignField: 'parentId'
});

userSchema.virtual('parentLinksAsChild', {
  ref: 'ParentLink',
  localField: '_id',
  foreignField: 'studentId'
});

const User = mongoose.model('User', userSchema);
module.exports = User;
