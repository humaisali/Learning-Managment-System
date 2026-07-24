const { Router } = require("express");
const enrollment = require("./enrollment.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");
const { attachClientIp } = require("../../middleware/audit");

const router = Router();

router.use(authenticate);
router.use(attachClientIp);

// Fee plans - public read, admin write
router.get("/plans", enrollment.listFeePlans);
router.post("/plans",
  authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  enrollment.createFeePlan
);
router.put("/plans/:id",
  authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  enrollment.updateFeePlan
);

// Enrollment operations
router.post("/create", authorize(ROLES.STUDENT), enrollment.createEnrollment);
router.get("/",
  authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  enrollment.listEnrollments
);

module.exports = router;
