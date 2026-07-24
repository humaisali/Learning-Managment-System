const mongoose = require("mongoose");
const User = require("../../models/User");
const RefreshToken = require("../../models/RefreshToken");
const TeacherProfile = require("../../models/TeacherProfile");
const { AppError } = require("../../utils/apiResponse");
const { createAuditLog } = require("../../middleware/audit");

async function listUsers({ page, limit, skip, role, status, search, sortBy }) {
  const query = {};

  if (role) query.role = role;

  if (status === "active") {
    query.isActive = true;
    query.isSuspended = false;
  } else if (status === "suspended") {
    query.isSuspended = true;
  } else if (status === "inactive") {
    query.isActive = false;
  }

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const sort = sortBy || { createdAt: -1 };

  const [users, total] = await Promise.all([
    User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("id email phone fullName role isActive isSuspended suspendReason lastLoginAt createdAt"),
    User.countDocuments(query),
  ]);

  return { users, total };
}

async function getUserById(id) {
  const user = await User.findById(id)
    .populate({
      path: "studentProfile",
      populate: [
        { path: "board", select: "id name" },
        { path: "class", select: "id name" },
        { path: "program", select: "id name" }
        // Note: _count aggregations (enrollments, doubts) need custom aggregate logic in Mongoose, 
        // omitted here for basic compatibility but should be added manually if needed.
      ]
    })
    .populate({
      path: "teacherProfile",
      populate: {
        path: "subjects",
        populate: { path: "subjectId", select: "id name" }
      }
    });

  if (!user) throw new AppError("User not found.", 404);
  return user;
}

async function suspendUser(userId, reason, actorId, ip) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);
  if (user.isSuspended) throw new AppError("User is already suspended.", 400);

  if (user.role === "SYSTEM_ADMIN") {
    throw new AppError("Cannot suspend a system administrator.", 403);
  }

  const updated = await User.findByIdAndUpdate(userId, { 
    isSuspended: true, 
    suspendReason: reason 
  }, { new: true });

  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );

  await createAuditLog({
    actorId,
    action: "SUSPEND_USER",
    targetType: "User",
    targetId: userId,
    before: { isSuspended: false },
    after: { isSuspended: true, suspendReason: reason },
    ipAddress: ip,
  });

  return updated;
}

async function reactivateUser(userId, actorId, ip) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);
  if (!user.isSuspended) throw new AppError("User is not suspended.", 400);

  const updated = await User.findByIdAndUpdate(userId, { 
    isSuspended: false, 
    suspendReason: null 
  }, { new: true });

  await createAuditLog({
    actorId,
    action: "REACTIVATE_USER",
    targetType: "User",
    targetId: userId,
    before: { isSuspended: true, suspendReason: user.suspendReason },
    after: { isSuspended: false },
    ipAddress: ip,
  });

  return updated;
}

async function createStaffUser(data, actorId, ip) {
  const bcrypt = require("bcryptjs");

  if (data.email) {
    const existing = await User.findOne({ email: data.email });
    if (existing) throw new AppError("Email already in use.", 409);
  }

  if (data.phone) {
    const existing = await User.findOne({ phone: data.phone });
    if (existing) throw new AppError("Phone number already in use.", 409);
  }

  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 12)
    : null;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [newUser] = await User.create([{
      email: data.email || null,
      phone: data.phone || null,
      passwordHash,
      fullName: data.fullName,
      role: data.role,
    }], { session });

    if (data.role === "CENTRAL_TEACHER" || data.role === "SUBJECT_TEACHER") {
      await TeacherProfile.create([{
        userId: newUser._id,
        teacherType: data.role === "CENTRAL_TEACHER" ? "CENTRAL" : "SUBJECT",
      }], { session });
    }

    await session.commitTransaction();
    
    await createAuditLog({
      actorId,
      action: "CREATE_STAFF_USER",
      targetType: "User",
      targetId: newUser._id.toString(),
      after: { role: newUser.role, fullName: newUser.fullName },
      ipAddress: ip,
    });

    return newUser;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  listUsers,
  getUserById,
  suspendUser,
  reactivateUser,
  createStaffUser,
};
