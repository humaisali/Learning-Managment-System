const { Router } = require("express");
const engagement = require("./engagement.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

// Student endpoints
router.post("/heartbeat",
  authorize(ROLES.STUDENT),
  engagement.processHeartbeat
);

router.get("/progress",
  authorize(ROLES.STUDENT),
  engagement.getProgress
);

router.get("/progress/topic/:topicId",
  authorize(ROLES.STUDENT),
  engagement.getTopicProgress
);

// Attention score (accessible by student, parent, admin)
router.get("/attention-score",
  authorize(ROLES.STUDENT, ROLES.PARENT, ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  engagement.getAttentionScore
);

module.exports = router;
