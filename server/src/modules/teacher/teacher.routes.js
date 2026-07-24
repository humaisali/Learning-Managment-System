const { Router } = require("express");
const teacherController = require("./teacher.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.CENTRAL_TEACHER, ROLES.SUBJECT_TEACHER));

router.get("/subjects", teacherController.getAssignedSubjects);

module.exports = router;
