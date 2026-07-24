const { Router } = require("express");
const doubt = require("./doubt.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { submitDoubtSchema, respondToDoubtSchema, updateDoubtStatusSchema } = require("./doubt.schema");

const router = Router();
router.use(authenticate);

// ─── Student routes ─────────────────────────────
router.post("/submit",
  authorize(ROLES.STUDENT),
  validate({ body: submitDoubtSchema }),
  doubt.submitDoubt
);

router.get("/my",
  authorize(ROLES.STUDENT),
  doubt.getMyDoubts
);

// Q&A thread for a topic (student + teacher view)
router.get("/topic/:topicId",
  authorize(ROLES.STUDENT, ROLES.SUBJECT_TEACHER, ROLES.CENTRAL_TEACHER, ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  doubt.getTopicQA
);

// Doubt detail
router.get("/:id",
  authenticate,
  doubt.getDoubtDetail
);

// ─── Teacher routes ─────────────────────────────
router.get("/teacher/queue",
  authorize(ROLES.SUBJECT_TEACHER),
  doubt.getTeacherQueue
);

router.post("/:id/respond",
  authorize(ROLES.SUBJECT_TEACHER),
  validate({ body: respondToDoubtSchema }),
  doubt.respondToDoubt
);

router.put("/:id/status",
  authorize(ROLES.SUBJECT_TEACHER),
  validate({ body: updateDoubtStatusSchema }),
  doubt.updateDoubtStatus
);

// ─── Admin routes ───────────────────────────────
router.get("/admin/unresolved",
  authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  doubt.getUnresolvedDoubts
);

module.exports = router;
