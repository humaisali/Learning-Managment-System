const { Router } = require("express");
const student = require("./student.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.STUDENT));

router.get("/dashboard", student.getDashboard);
router.get("/subjects", student.getEnrolledSubjects);
router.get("/subjects/:subjectId/topics", student.getSubjectTopics);

module.exports = router;
