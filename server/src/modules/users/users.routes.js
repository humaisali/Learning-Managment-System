const { Router } = require("express");
const users = require("./users.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");
const { attachClientIp } = require("../../middleware/audit");

const router = Router();

router.use(authenticate);
router.use(attachClientIp);

const adminRoles = [ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN];

router.get("/", authorize(...adminRoles), users.listUsers);
router.get("/:id", authorize(...adminRoles), users.getUserById);
router.put("/:id/suspend", authorize(...adminRoles), users.suspendUser);
router.put("/:id/reactivate", authorize(...adminRoles), users.reactivateUser);
router.post("/staff", authorize(ROLES.SYSTEM_ADMIN), users.createStaffUser);

module.exports = router;
