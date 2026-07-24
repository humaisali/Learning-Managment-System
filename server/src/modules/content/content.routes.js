const { Router } = require("express");
const content = require("./content.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { attachClientIp } = require("../../middleware/audit");
const {
  createVideoAssetSchema, saveKeyPointsSchema,
  createMCQSetSchema, submitMCQAttemptSchema,
  updateVideoMetadataSchema, createSubjectiveQuestionSchema,
} = require("./content.schema");

const router = Router();
router.use(authenticate);
router.use(attachClientIp);

const teacherRoles = [ROLES.CENTRAL_TEACHER, ROLES.SUBJECT_TEACHER];

// ─── Teacher Content Management ─────────────────
router.post("/upload/video",
  authorize(...teacherRoles),
  validate({ body: createVideoAssetSchema }),
  content.initiateVideoUpload
);

router.put("/upload/video/:id/confirm",
  authorize(...teacherRoles),
  content.confirmVideoUpload
);

router.post("/key-points",
  authorize(...teacherRoles),
  validate({ body: saveKeyPointsSchema }),
  content.saveKeyPoints
);

router.post("/subjective-question",
  authorize(...teacherRoles),
  validate({ body: createSubjectiveQuestionSchema }),
  content.saveSubjectiveQuestion
);

router.post("/mcq",
  authorize(...teacherRoles),
  validate({ body: createMCQSetSchema }),
  content.createMCQSet
);

router.put("/mcq/:id",
  authorize(...teacherRoles),
  content.updateMCQSet
);

router.put("/:id/publish",
  authorize(...teacherRoles, ROLES.SYSTEM_ADMIN),
  content.publishAsset
);

router.put("/:id/unpublish",
  authorize(...teacherRoles, ROLES.SYSTEM_ADMIN),
  content.unpublishAsset
);

router.get("/my-content",
  authorize(...teacherRoles),
  content.listMyContent
);

// ─── Student Content Access ─────────────────────
router.get("/topic/:topicId",
  authorize(ROLES.STUDENT, ...teacherRoles, ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN),
  content.getTopicContent
);

router.get("/playback/:assetId",
  authorize(ROLES.STUDENT),
  content.getPlaybackUrl
);

router.get("/mcq/topic/:topicId",
  authorize(ROLES.STUDENT, ...teacherRoles),
  content.getMCQSets
);

router.post("/mcq/attempt",
  authorize(ROLES.STUDENT),
  validate({ body: submitMCQAttemptSchema }),
  content.submitMCQAttempt
);

module.exports = router;
