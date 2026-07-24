const mongoose = require("mongoose");
const Enrollment = require("../../models/Enrollment");
const Payment = require("../../models/Payment");
const Complaint = require("../../models/Complaint");
const User = require("../../models/User");

function toCSV(data, columns) {
  if (data.length === 0) return columns.map((c) => c.header).join(",") + "\n";

  const header = columns.map((c) => c.header).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let val = col.accessor(row);
        if (val === null || val === undefined) val = "";
        val = String(val).replace(/"/g, '""');
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          val = `"${val}"`;
        }
        return val;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

async function exportEnrollments({ status, startDate, endDate } = {}) {
  const query = {};
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const enrollments = await Enrollment.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'fullName email phone' }
    })
    .populate('feePlanId', 'name amount learningType')
    .populate('payment', 'status method amount confirmedAt');

  const columns = [
    { header: "Enrollment ID", accessor: (r) => r._id },
    { header: "Student Name", accessor: (r) => r.studentId?.userId?.fullName },
    { header: "Email", accessor: (r) => r.studentId?.userId?.email },
    { header: "Phone", accessor: (r) => r.studentId?.userId?.phone },
    { header: "Plan", accessor: (r) => r.feePlanId?.name },
    { header: "Learning Type", accessor: (r) => r.learningType },
    { header: "Amount (PKR)", accessor: (r) => r.feePlanId?.amount },
    { header: "Enrollment Status", accessor: (r) => r.status },
    { header: "Payment Status", accessor: (r) => r.payment?.status || "No payment" },
    { header: "Payment Method", accessor: (r) => r.payment?.method },
    { header: "Created At", accessor: (r) => r.createdAt?.toISOString() },
    { header: "Activated At", accessor: (r) => r.activatedAt?.toISOString() },
    { header: "Expires At", accessor: (r) => r.endDate?.toISOString() },
  ];

  return { csv: toCSV(enrollments, columns), count: enrollments.length, filename: "enrollments_export.csv" };
}

async function exportPayments({ status, method, startDate, endDate } = {}) {
  const query = {};
  if (status) query.status = status;
  if (method) query.method = method;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const payments = await Payment.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: 'enrollmentId',
      populate: [
        { path: 'studentId', populate: { path: 'userId', select: 'fullName email' } },
        { path: 'feePlanId', select: 'name' }
      ]
    });

  const columns = [
    { header: "Payment ID", accessor: (r) => r._id },
    { header: "Student", accessor: (r) => r.enrollmentId?.studentId?.userId?.fullName },
    { header: "Email", accessor: (r) => r.enrollmentId?.studentId?.userId?.email },
    { header: "Plan", accessor: (r) => r.enrollmentId?.feePlanId?.name },
    { header: "Amount", accessor: (r) => r.amount },
    { header: "Currency", accessor: (r) => r.currency },
    { header: "Method", accessor: (r) => r.method },
    { header: "Status", accessor: (r) => r.status },
    { header: "Gateway Ref", accessor: (r) => r.gatewayRef },
    { header: "Created At", accessor: (r) => r.createdAt?.toISOString() },
    { header: "Confirmed At", accessor: (r) => r.confirmedAt?.toISOString() },
    { header: "Verified By", accessor: (r) => r.verifiedBy },
  ];

  return { csv: toCSV(payments, columns), count: payments.length, filename: "payments_export.csv" };
}

async function exportComplaints({ status, startDate, endDate } = {}) {
  const query = {};
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const complaints = await Complaint.find(query).sort({ createdAt: -1 });

  const userIds = [...new Set(complaints.map((c) => c.userId))];
  const users = await User.find({ _id: { $in: userIds } }).select('_id fullName email');
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const columns = [
    { header: "Complaint ID", accessor: (r) => r._id },
    { header: "User", accessor: (r) => userMap[r.userId.toString()]?.fullName },
    { header: "Email", accessor: (r) => userMap[r.userId.toString()]?.email },
    { header: "Type", accessor: (r) => r.type },
    { header: "Subject", accessor: (r) => r.subject },
    { header: "Description", accessor: (r) => r.description },
    { header: "Status", accessor: (r) => r.status },
    { header: "Resolution", accessor: (r) => r.resolution },
    { header: "Created At", accessor: (r) => r.createdAt?.toISOString() },
    { header: "Updated At", accessor: (r) => r.updatedAt?.toISOString() },
  ];

  return { csv: toCSV(complaints, columns), count: complaints.length, filename: "complaints_export.csv" };
}

module.exports = { exportEnrollments, exportPayments, exportComplaints };
