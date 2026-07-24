const catalogService = require("./catalog.service");
const { sendSuccess } = require("../../utils/apiResponse");

// ─── Boards ─────────────────────────────────────
async function listBoards(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const boards = await catalogService.listBoards(includeInactive);
    return sendSuccess(res, boards, "Boards retrieved.");
  } catch (error) { next(error); }
}

async function getBoardById(req, res, next) {
  try {
    const board = await catalogService.getBoardById(req.params.id);
    return sendSuccess(res, board, "Board retrieved.");
  } catch (error) { next(error); }
}

async function createBoard(req, res, next) {
  try {
    const board = await catalogService.createBoard(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, board, "Board created.", 201);
  } catch (error) { next(error); }
}

async function updateBoard(req, res, next) {
  try {
    const board = await catalogService.updateBoard(req.params.id, req.body, req.user.id, req.clientIp);
    return sendSuccess(res, board, "Board updated.");
  } catch (error) { next(error); }
}

// ─── Classes ────────────────────────────────────
async function listClassesByBoard(req, res, next) {
  try {
    const classes = await catalogService.listClassesByBoard(req.params.boardId);
    return sendSuccess(res, classes, "Classes retrieved.");
  } catch (error) { next(error); }
}

async function createClass(req, res, next) {
  try {
    const cls = await catalogService.createClass(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, cls, "Class created.", 201);
  } catch (error) { next(error); }
}

async function updateClass(req, res, next) {
  try {
    const cls = await catalogService.updateClass(req.params.id, req.body, req.user.id, req.clientIp);
    return sendSuccess(res, cls, "Class updated.");
  } catch (error) { next(error); }
}

// ─── Programs ───────────────────────────────────
async function listPrograms(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const programs = await catalogService.listPrograms(includeInactive);
    return sendSuccess(res, programs, "Programs retrieved.");
  } catch (error) { next(error); }
}

async function createProgram(req, res, next) {
  try {
    const program = await catalogService.createProgram(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, program, "Program created.", 201);
  } catch (error) { next(error); }
}

async function updateProgram(req, res, next) {
  try {
    const program = await catalogService.updateProgram(req.params.id, req.body, req.user.id, req.clientIp);
    return sendSuccess(res, program, "Program updated.");
  } catch (error) { next(error); }
}

// ─── Modules ────────────────────────────────────
async function listModulesByProgram(req, res, next) {
  try {
    const modules = await catalogService.listModulesByProgram(req.params.programId);
    return sendSuccess(res, modules, "Modules retrieved.");
  } catch (error) { next(error); }
}

async function createModule(req, res, next) {
  try {
    const mod = await catalogService.createModule(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, mod, "Module created.", 201);
  } catch (error) { next(error); }
}

// ─── Subjects ───────────────────────────────────
async function listSubjectsByClass(req, res, next) {
  try {
    const subjects = await catalogService.listSubjectsByClass(req.params.classId);
    return sendSuccess(res, subjects, "Subjects retrieved.");
  } catch (error) { next(error); }
}

async function listSubjectsByModule(req, res, next) {
  try {
    const subjects = await catalogService.listSubjectsByModule(req.params.moduleId);
    return sendSuccess(res, subjects, "Subjects retrieved.");
  } catch (error) { next(error); }
}

async function createSubject(req, res, next) {
  try {
    const subject = await catalogService.createSubject(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, subject, "Subject created.", 201);
  } catch (error) { next(error); }
}

async function updateSubject(req, res, next) {
  try {
    const subject = await catalogService.updateSubject(req.params.id, req.body, req.user.id, req.clientIp);
    return sendSuccess(res, subject, "Subject updated.");
  } catch (error) { next(error); }
}

// ─── Topics ─────────────────────────────────────
async function listTopicsBySubject(req, res, next) {
  try {
    const topics = await catalogService.listTopicsBySubject(req.params.subjectId);
    return sendSuccess(res, topics, "Topics retrieved.");
  } catch (error) { next(error); }
}

async function getTopicById(req, res, next) {
  try {
    const topic = await catalogService.getTopicById(req.params.id);
    return sendSuccess(res, topic, "Topic retrieved.");
  } catch (error) { next(error); }
}

async function createTopic(req, res, next) {
  try {
    const topic = await catalogService.createTopic(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, topic, "Topic created.", 201);
  } catch (error) { next(error); }
}

async function updateTopic(req, res, next) {
  try {
    const topic = await catalogService.updateTopic(req.params.id, req.body, req.user.id, req.clientIp);
    return sendSuccess(res, topic, "Topic updated.");
  } catch (error) { next(error); }
}

// ─── Teacher Assignment ─────────────────────────
async function assignTeacher(req, res, next) {
  try {
    const { teacherProfileId, subjectId } = req.body;
    const result = await catalogService.assignTeacherToSubject(teacherProfileId, subjectId, req.user.id, req.clientIp);
    return sendSuccess(res, result, "Teacher assigned to subject.", 201);
  } catch (error) { next(error); }
}

async function removeTeacher(req, res, next) {
  try {
    const { teacherProfileId, subjectId } = req.body;
    const result = await catalogService.removeTeacherFromSubject(teacherProfileId, subjectId, req.user.id, req.clientIp);
    return sendSuccess(res, result, "Teacher removed from subject.");
  } catch (error) { next(error); }
}

module.exports = {
  listBoards, getBoardById, createBoard, updateBoard,
  listClassesByBoard, createClass, updateClass,
  listPrograms, createProgram, updateProgram,
  listModulesByProgram, createModule,
  listSubjectsByClass, listSubjectsByModule, createSubject, updateSubject,
  listTopicsBySubject, getTopicById, createTopic, updateTopic,
  assignTeacher, removeTeacher,
};
