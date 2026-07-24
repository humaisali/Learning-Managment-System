const { Router } = require("express");
const catalog = require("./catalog.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { attachClientIp } = require("../../middleware/audit");
const {
  createBoardSchema, updateBoardSchema,
  createClassSchema, updateClassSchema,
  createProgramSchema, updateProgramSchema,
  createModuleSchema,
  createSubjectSchema, updateSubjectSchema,
  createTopicSchema, updateTopicSchema,
  idParamSchema,
} = require("./catalog.schema");

const router = Router();

// All catalog routes require authentication
router.use(authenticate);
router.use(attachClientIp);

// ─── Public Read Routes (any authenticated user) ─────────
router.get("/boards", catalog.listBoards);
router.get("/boards/:id", validate({ params: idParamSchema }), catalog.getBoardById);
router.get("/boards/:boardId/classes", catalog.listClassesByBoard);
router.get("/classes/:classId/subjects", catalog.listSubjectsByClass);
router.get("/subjects/:subjectId/topics", catalog.listTopicsBySubject);
router.get("/topics/:id", validate({ params: idParamSchema }), catalog.getTopicById);
router.get("/programs", catalog.listPrograms);
router.get("/programs/:programId/modules", catalog.listModulesByProgram);
router.get("/modules/:moduleId/subjects", catalog.listSubjectsByModule);

// ─── Admin Write Routes (System Admin + Head Office) ─────
const adminRoles = [ROLES.SYSTEM_ADMIN, ROLES.HEAD_OFFICE];

router.post("/boards",
  authorize(...adminRoles),
  validate({ body: createBoardSchema }),
  catalog.createBoard
);
router.put("/boards/:id",
  authorize(...adminRoles),
  validate({ params: idParamSchema, body: updateBoardSchema }),
  catalog.updateBoard
);

router.post("/classes",
  authorize(...adminRoles),
  validate({ body: createClassSchema }),
  catalog.createClass
);
router.put("/classes/:id",
  authorize(...adminRoles),
  validate({ params: idParamSchema, body: updateClassSchema }),
  catalog.updateClass
);

router.post("/programs",
  authorize(...adminRoles),
  validate({ body: createProgramSchema }),
  catalog.createProgram
);
router.put("/programs/:id",
  authorize(...adminRoles),
  validate({ params: idParamSchema, body: updateProgramSchema }),
  catalog.updateProgram
);

router.post("/modules",
  authorize(...adminRoles),
  validate({ body: createModuleSchema }),
  catalog.createModule
);

router.post("/subjects",
  authorize(...adminRoles),
  validate({ body: createSubjectSchema }),
  catalog.createSubject
);
router.put("/subjects/:id",
  authorize(...adminRoles),
  validate({ params: idParamSchema, body: updateSubjectSchema }),
  catalog.updateSubject
);

router.post("/topics",
  authorize(...adminRoles),
  validate({ body: createTopicSchema }),
  catalog.createTopic
);
router.put("/topics/:id",
  authorize(...adminRoles),
  validate({ params: idParamSchema, body: updateTopicSchema }),
  catalog.updateTopic
);

// ─── Teacher Assignment (System Admin only) ──────────────
router.post("/teacher-assignment",
  authorize(ROLES.SYSTEM_ADMIN),
  catalog.assignTeacher
);
router.delete("/teacher-assignment",
  authorize(ROLES.SYSTEM_ADMIN),
  catalog.removeTeacher
);

module.exports = router;
