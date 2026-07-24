const { Router } = require("express");
const parent = require("./parent.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.PARENT));

router.get("/dashboard", parent.getDashboard);
router.get("/child/:childId/progress", parent.getChildProgress);
router.get("/messages/threads", parent.getMessageThreads);
router.get("/messages/:teacherId/:subjectId", parent.getMessages);
router.post("/messages/send", parent.sendMessage);

module.exports = router;
