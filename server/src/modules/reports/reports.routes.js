const { Router } = require("express");
const reports = require("./reports.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN));

router.get("/export/enrollments", reports.exportEnrollments);
router.get("/export/payments", reports.exportPayments);
router.get("/export/complaints", reports.exportComplaints);

module.exports = router;
