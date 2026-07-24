const mongoose = require("mongoose");
const { AppError } = require("../../utils/apiResponse");
const { createAuditLog } = require("../../middleware/audit");

const User = require("../../models/User");
const Enrollment = require("../../models/Enrollment");
const Payment = require("../../models/Payment");
const Complaint = require("../../models/Complaint");
const Doubt = require("../../models/Doubt");
const ContentAsset = require("../../models/ContentAsset");
const Subject = require("../../models/Subject");
const StudentTopicProgress = require("../../models/StudentTopicProgress");
const AuditLog = require("../../models/AuditLog");

// ═══════════════════════════════════════════════════
// DASHBOARD METRICS
// ═══════════════════════════════════════════════════

async function getDashboardMetrics() {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalStudents,
    studentsThisMonth,
    activeEnrollments,
    revenueThisMonthAgg,
    revenueLastMonthAgg,
    openComplaints,
    pendingBankTransfers,
    unresolvedDoubts,
    totalTeachers,
    contentUploadsThisMonth,
  ] = await Promise.all([
    User.countDocuments({ role: "STUDENT", isActive: true }),
    User.countDocuments({ role: "STUDENT", isActive: true, createdAt: { $gte: thisMonth } }),
    Enrollment.countDocuments({ status: "ACTIVE" }),
    Payment.aggregate([
      { $match: { status: "CONFIRMED", confirmedAt: { $gte: thisMonth } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ]),
    Payment.aggregate([
      { $match: { status: "CONFIRMED", confirmedAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ]),
    Complaint.countDocuments({ status: { $in: ["OPEN", "IN_PROGRESS"] } }),
    Payment.countDocuments({ method: "BANK_TRANSFER", status: { $in: ["INITIATED", "PENDING"] } }),
    Doubt.countDocuments({
      status: { $in: ["NEW", "ESCALATED"] },
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    User.countDocuments({ role: { $in: ["CENTRAL_TEACHER", "SUBJECT_TEACHER"] }, isActive: true }),
    ContentAsset.countDocuments({ createdAt: { $gte: thisMonth } }),
  ]);

  const thisMonthRev = revenueThisMonthAgg.length > 0 ? Number(revenueThisMonthAgg[0].amount) : 0;
  const lastMonthRev = revenueLastMonthAgg.length > 0 ? Number(revenueLastMonthAgg[0].amount) : 0;
  const revenueTrend = lastMonthRev > 0
    ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
    : 0;

  return {
    totalStudents,
    newStudentsThisMonth: studentsThisMonth,
    activeEnrollments,
    revenue: {
      thisMonth: thisMonthRev,
      lastMonth: lastMonthRev,
      trendPercent: revenueTrend,
    },
    openComplaints,
    pendingBankTransfers,
    unresolvedDoubts24h: unresolvedDoubts,
    totalTeachers,
    contentUploadsThisMonth,
  };
}

// ═══════════════════════════════════════════════════
// COMPLAINT / REFUND MANAGEMENT
// ═══════════════════════════════════════════════════

async function listComplaints({ page, limit, skip, status, type, search } = {}) {
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { subject: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Complaint.countDocuments(query),
  ]);

  const userIds = [...new Set(complaints.map((c) => c.userId))];
  const users = await User.find({ _id: { $in: userIds } }).select("id fullName email role");
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const enriched = complaints.map((c) => ({
    ...c.toObject(),
    user: userMap[c.userId.toString()] || null,
  }));

  return { complaints: enriched, total };
}

async function createComplaint(userId, data) {
  return Complaint.create({
    userId,
    type: data.type,
    subject: data.subject,
    description: data.description,
  });
}

async function updateComplaint(complaintId, data, actorId, ip) {
  const existing = await Complaint.findById(complaintId);
  if (!existing) throw new AppError("Complaint not found.", 404);

  const updateData = {};
  if (data.status) updateData.status = data.status;
  if (data.assignedTo) updateData.assignedTo = data.assignedTo;
  if (data.resolution) updateData.resolution = data.resolution;

  const updated = await Complaint.findByIdAndUpdate(complaintId, updateData, { new: true });

  await createAuditLog({
    actorId,
    action: "UPDATE_COMPLAINT",
    targetType: "Complaint",
    targetId: complaintId,
    before: { status: existing.status },
    after: updateData,
    ipAddress: ip,
  });

  return updated;
}

// ═══════════════════════════════════════════════════
// CONTENT ACTIVITY (for admin oversight)
// ═══════════════════════════════════════════════════

async function getContentActivity({ page, limit, skip } = {}) {
  const [assets, total] = await Promise.all([
    ContentAsset.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'teacherId',
        populate: { path: 'userId', select: 'fullName' }
      })
      .populate({
        path: 'topicId',
        select: 'title',
        populate: { path: 'subjectId', select: 'name' }
      }),
    ContentAsset.countDocuments(),
  ]);

  return { assets, total };
}

// ═══════════════════════════════════════════════════
// ENGAGEMENT SUMMARY (cross-subject)
// ═══════════════════════════════════════════════════

async function getEngagementSummary() {
  const subjects = await Subject.find({ isActive: true })
    .populate('topics', '_id');

  const result = [];

  for (const subject of subjects) {
    const topicIds = subject.topics ? subject.topics.map(t => t._id) : [];

    const doubtsCount = await Doubt.countDocuments({ subjectId: subject._id });

    const [progressData, contentCount] = await Promise.all([
      StudentTopicProgress.aggregate([
        { $match: { topicId: { $in: topicIds } } },
        { $group: { _id: null, count: { $sum: 1 }, avgSeconds: { $avg: "$watchedSeconds" } } }
      ]),
      ContentAsset.countDocuments({ topicId: { $in: topicIds }, publishState: "PUBLISHED" })
    ]);

    result.push({
      subjectId: subject._id,
      subjectName: subject.name,
      totalTopics: topicIds.length,
      totalDoubts: doubtsCount,
      publishedContent: contentCount,
      studentsEngaged: progressData.length > 0 ? progressData[0].count : 0,
      avgWatchSeconds: progressData.length > 0 ? Math.round(progressData[0].avgSeconds || 0) : 0,
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════
// AUDIT LOG QUERIES
// ═══════════════════════════════════════════════════

async function getAuditLogs({ page, limit, skip, actorId, action, targetType } = {}) {
  const query = {};
  if (actorId) query.actorId = actorId;
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('actorId', 'fullName role'),
    AuditLog.countDocuments(query),
  ]);

  return { logs, total };
}

module.exports = {
  getDashboardMetrics,
  listComplaints,
  createComplaint,
  updateComplaint,
  getContentActivity,
  getEngagementSummary,
  getAuditLogs,
};
