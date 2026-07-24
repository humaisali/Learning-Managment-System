const { Router } = require("express");
const admin = require("./admin.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");
const { attachClientIp } = require("../../middleware/audit");

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN));
router.use(attachClientIp);

router.get("/dashboard", admin.getDashboard);
router.get("/complaints", admin.listComplaints);
router.put("/complaints/:id", admin.updateComplaint);
router.get("/content-activity", admin.getContentActivity);
router.get("/engagement-summary", admin.getEngagementSummary);
router.get("/audit-logs", authorize(ROLES.SYSTEM_ADMIN), admin.getAuditLogs);

// Complaints can also be created by students/parents
const publicComplaint = Router();
publicComplaint.use(authenticate);
publicComplaint.post("/", admin.createComplaint);

module.exports = { adminRouter: router, complaintRouter: publicComplaint };
