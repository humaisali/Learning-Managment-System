const { Router } = require("express");
const liveSession = require("./liveSession.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

// Teacher routes
router.post("/create",
  authorize(ROLES.SUBJECT_TEACHER),
  liveSession.createSession
);

router.post("/:id/start",
  authorize(ROLES.SUBJECT_TEACHER),
  liveSession.startSession
);

router.post("/:id/end",
  authorize(ROLES.SUBJECT_TEACHER),
  liveSession.endSession
);

router.get("/my-sessions",
  authorize(ROLES.SUBJECT_TEACHER, ROLES.CENTRAL_TEACHER),
  liveSession.getTeacherSessions
);

// Student routes
router.get("/upcoming",
  authorize(ROLES.STUDENT),
  liveSession.getUpcomingSessions
);

// Shared
router.get("/:id",
  authorize(ROLES.STUDENT, ROLES.SUBJECT_TEACHER, ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  liveSession.getSession
);

module.exports = router;
