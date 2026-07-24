const mongoose = require("mongoose");
const FeePlan = require("../../models/FeePlan");
const Enrollment = require("../../models/Enrollment");
const StudentProfile = require("../../models/StudentProfile");
const Class = require("../../models/Class");
const { AppError } = require("../../utils/apiResponse");
const { createAuditLog } = require("../../middleware/audit");

// ═══════════════════════════════════════════════════
// FEE PLANS
// ═══════════════════════════════════════════════════

async function listFeePlans({ learningType, classId, programId, includeInactive } = {}) {
  const query = {};

  if (!includeInactive) query.isActive = true;
  if (learningType) query.learningType = learningType;
  if (classId) query.classId = classId;
  if (programId) query.programId = programId;

  return FeePlan.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: 'classId',
      select: 'id name',
      populate: { path: 'boardId', select: 'id name' }
    })
    .populate({ path: 'programId', select: 'id name' });
}

async function createFeePlan(data, actorId, ip) {
  if (data.learningType === "CURRICULUM" && !data.classId) {
    throw new AppError("classId is required for curriculum-based fee plans.", 422);
  }
  if (data.learningType === "SKILL_BASED" && !data.programId) {
    throw new AppError("programId is required for skill-based fee plans.", 422);
  }

  const plan = await FeePlan.create(data);

  await createAuditLog({
    actorId,
    action: "CREATE_FEE_PLAN",
    targetType: "FeePlan",
    targetId: plan._id.toString(),
    after: plan,
    ipAddress: ip,
  });

  return plan;
}

async function updateFeePlan(id, data, actorId, ip) {
  const existing = await FeePlan.findById(id);
  if (!existing) throw new AppError("Fee plan not found.", 404);

  const plan = await FeePlan.findByIdAndUpdate(id, data, { new: true });

  await createAuditLog({
    actorId,
    action: "UPDATE_FEE_PLAN",
    targetType: "FeePlan",
    targetId: id,
    before: existing,
    after: plan,
    ipAddress: ip,
  });

  return plan;
}

// ═══════════════════════════════════════════════════
// ENROLLMENT
// ═══════════════════════════════════════════════════

async function createEnrollment(studentProfileId, feePlanId) {
  const student = await StudentProfile.findById(studentProfileId);
  if (!student) throw new AppError("Student profile not found.", 404);

  const feePlan = await FeePlan.findById(feePlanId);
  if (!feePlan) throw new AppError("Fee plan not found.", 404);
  if (!feePlan.isActive) throw new AppError("This fee plan is no longer available.", 400);

  const existingActive = await Enrollment.findOne({
    studentId: studentProfileId,
    feePlanId,
    status: { $in: ["PENDING", "ACTIVE"] },
  });

  if (existingActive) {
    if (existingActive.status === "ACTIVE") {
      throw new AppError("You already have an active enrollment for this plan.", 409);
    }
    return existingActive;
  }

  const enrollment = await Enrollment.create({
    studentId: studentProfileId,
    feePlanId,
    learningType: feePlan.learningType,
    status: "PENDING",
  });

  return Enrollment.findById(enrollment._id).populate('feePlanId');
}

async function activateEnrollment(enrollmentId) {
  const enrollment = await Enrollment.findById(enrollmentId)
    .populate('feePlanId')
    .populate({
      path: 'studentId',
      populate: { path: 'userId' }
    });

  if (!enrollment) throw new AppError("Enrollment not found.", 404);
  if (enrollment.status === "ACTIVE") return enrollment;
  if (enrollment.status !== "PENDING") {
    throw new AppError(`Cannot activate enrollment in ${enrollment.status} state.`, 400);
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + enrollment.feePlanId.durationDays);

  const activated = await Enrollment.findByIdAndUpdate(
    enrollmentId,
    {
      status: "ACTIVE",
      startDate: now,
      endDate,
      activatedAt: now,
    },
    { new: true }
  );

  const profileUpdate = {};
  if (enrollment.feePlanId.classId) {
    const cls = await Class.findById(enrollment.feePlanId.classId).populate('boardId');
    if (cls) {
      profileUpdate.classId = cls._id;
      profileUpdate.boardId = cls.boardId._id || cls.boardId;
    }
  }
  if (enrollment.feePlanId.programId) {
    profileUpdate.programId = enrollment.feePlanId.programId;
  }

  if (Object.keys(profileUpdate).length > 0) {
    await StudentProfile.findByIdAndUpdate(enrollment.studentId._id, profileUpdate);
  }

  return activated;
}

async function listEnrollments({ page, limit, skip, status, studentId, search }) {
  const query = {};

  if (status) query.status = status;
  if (studentId) query.studentId = studentId;

  // Search logic for student's user profile (requires manual lookup or simplified approach)
  // For Mongoose, we usually do this in two steps or an aggregate if we need to search populated fields
  if (search) {
    const User = require("../../models/User");
    const users = await User.find({
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }).select('_id');
    const userIds = users.map(u => u._id);
    
    const students = await StudentProfile.find({ userId: { $in: userIds } }).select('_id');
    const studentIds = students.map(s => s._id);
    
    query.studentId = { ...query.studentId, $in: studentIds };
  }

  const [enrollments, total] = await Promise.all([
    Enrollment.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'id fullName email phone' }
      })
      .populate({
        path: 'feePlanId',
        populate: [
          { path: 'classId', select: 'name', populate: { path: 'boardId', select: 'name' } },
          { path: 'programId', select: 'name' }
        ]
      })
      .populate('payment'),
    Enrollment.countDocuments(query),
  ]);

  return { enrollments, total };
}

module.exports = {
  listFeePlans,
  createFeePlan,
  updateFeePlan,
  createEnrollment,
  activateEnrollment,
  listEnrollments,
};
