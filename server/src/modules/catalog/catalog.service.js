const mongoose = require("mongoose");
const Board = require("../../models/Board");
const Class = require("../../models/Class");
const Program = require("../../models/Program");
const Module = require("../../models/Module");
const Subject = require("../../models/Subject");
const Topic = require("../../models/Topic");
const TeacherSubject = require("../../models/TeacherSubject");
const TeacherProfile = require("../../models/TeacherProfile");
const { AppError } = require("../../utils/apiResponse");
const { createAuditLog } = require("../../middleware/audit");

// ═══════════════════════════════════════════════════
// BOARDS
// ═══════════════════════════════════════════════════

async function listBoards(includeInactive = false) {
  const query = includeInactive ? {} : { isActive: true };
  const boards = await Board.find(query).sort({ sortOrder: 1 });
  // Mongoose doesn't have a built in _count like Prisma, we can do an aggregation or just fetch them without count
  // In a real scenario, we might use aggregation pipeline here.
  return boards;
}

async function getBoardById(id) {
  const board = await Board.findById(id).populate({
    path: 'classes',
    match: { isActive: true },
    options: { sort: { sortOrder: 1 } }
  });

  if (!board) throw new AppError("Board not found.", 404);
  return board;
}

async function createBoard(data, actorId, ip) {
  const existing = await Board.findOne({ name: data.name });
  if (existing) throw new AppError("A board with this name already exists.", 409);

  const board = await Board.create(data);

  await createAuditLog({
    actorId,
    action: "CREATE_BOARD",
    targetType: "Board",
    targetId: board._id.toString(),
    after: board,
    ipAddress: ip,
  });

  return board;
}

async function updateBoard(id, data, actorId, ip) {
  const existing = await Board.findById(id);
  if (!existing) throw new AppError("Board not found.", 404);

  if (data.name && data.name !== existing.name) {
    const duplicate = await Board.findOne({ name: data.name });
    if (duplicate) throw new AppError("A board with this name already exists.", 409);
  }

  const board = await Board.findByIdAndUpdate(id, data, { new: true });

  await createAuditLog({
    actorId,
    action: "UPDATE_BOARD",
    targetType: "Board",
    targetId: id,
    before: existing,
    after: board,
    ipAddress: ip,
  });

  return board;
}

// ═══════════════════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════════════════

async function listClassesByBoard(boardId) {
  const board = await Board.findById(boardId);
  if (!board) throw new AppError("Board not found.", 404);

  return Class.find({ boardId, isActive: true }).sort({ sortOrder: 1 });
}

async function createClass(data, actorId, ip) {
  const board = await Board.findById(data.boardId);
  if (!board) throw new AppError("Board not found.", 404);

  const existing = await Class.findOne({ boardId: data.boardId, name: data.name });
  if (existing) throw new AppError("This class already exists under this board.", 409);

  const cls = await Class.create(data);

  await createAuditLog({
    actorId,
    action: "CREATE_CLASS",
    targetType: "Class",
    targetId: cls._id.toString(),
    after: cls,
    ipAddress: ip,
  });

  return cls;
}

async function updateClass(id, data, actorId, ip) {
  const existing = await Class.findById(id);
  if (!existing) throw new AppError("Class not found.", 404);

  const cls = await Class.findByIdAndUpdate(id, data, { new: true });

  await createAuditLog({
    actorId,
    action: "UPDATE_CLASS",
    targetType: "Class",
    targetId: id,
    before: existing,
    after: cls,
    ipAddress: ip,
  });

  return cls;
}

// ═══════════════════════════════════════════════════
// PROGRAMS (Skill-Based)
// ═══════════════════════════════════════════════════

async function listPrograms(includeInactive = false) {
  const query = includeInactive ? {} : { isActive: true };
  return Program.find(query).sort({ sortOrder: 1 });
}

async function createProgram(data, actorId, ip) {
  const existing = await Program.findOne({ name: data.name });
  if (existing) throw new AppError("A program with this name already exists.", 409);

  const program = await Program.create(data);

  await createAuditLog({
    actorId,
    action: "CREATE_PROGRAM",
    targetType: "Program",
    targetId: program._id.toString(),
    after: program,
    ipAddress: ip,
  });

  return program;
}

async function updateProgram(id, data, actorId, ip) {
  const existing = await Program.findById(id);
  if (!existing) throw new AppError("Program not found.", 404);

  const program = await Program.findByIdAndUpdate(id, data, { new: true });

  await createAuditLog({
    actorId,
    action: "UPDATE_PROGRAM",
    targetType: "Program",
    targetId: id,
    before: existing,
    after: program,
    ipAddress: ip,
  });

  return program;
}

// ═══════════════════════════════════════════════════
// MODULES (under Programs)
// ═══════════════════════════════════════════════════

async function listModulesByProgram(programId) {
  const program = await Program.findById(programId);
  if (!program) throw new AppError("Program not found.", 404);

  return Module.find({ programId }).sort({ sortOrder: 1 });
}

async function createModule(data, actorId, ip) {
  const program = await Program.findById(data.programId);
  if (!program) throw new AppError("Program not found.", 404);

  const existing = await Module.findOne({ programId: data.programId, name: data.name });
  if (existing) throw new AppError("This module already exists under this program.", 409);

  const mod = await Module.create(data);

  await createAuditLog({
    actorId,
    action: "CREATE_MODULE",
    targetType: "Module",
    targetId: mod._id.toString(),
    after: mod,
    ipAddress: ip,
  });

  return mod;
}

// ═══════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════

async function listSubjectsByClass(classId) {
  const cls = await Class.findById(classId);
  if (!cls) throw new AppError("Class not found.", 404);

  return Subject.find({ classId, isActive: true })
    .sort({ sortOrder: 1 })
    .populate({
      path: 'teacherSubjects',
      populate: {
        path: 'teacherId',
        populate: { path: 'userId', select: 'id fullName' }
      }
    });
}

async function listSubjectsByModule(moduleId) {
  const mod = await Module.findById(moduleId);
  if (!mod) throw new AppError("Module not found.", 404);

  return Subject.find({ moduleId, isActive: true }).sort({ sortOrder: 1 });
}

async function createSubject(data, actorId, ip) {
  if (data.classId) {
    const cls = await Class.findById(data.classId);
    if (!cls) throw new AppError("Class not found.", 404);
  }

  if (data.moduleId) {
    const mod = await Module.findById(data.moduleId);
    if (!mod) throw new AppError("Module not found.", 404);
  }

  const subject = await Subject.create(data);

  await createAuditLog({
    actorId,
    action: "CREATE_SUBJECT",
    targetType: "Subject",
    targetId: subject._id.toString(),
    after: subject,
    ipAddress: ip,
  });

  return subject;
}

async function updateSubject(id, data, actorId, ip) {
  const existing = await Subject.findById(id);
  if (!existing) throw new AppError("Subject not found.", 404);

  const subject = await Subject.findByIdAndUpdate(id, data, { new: true });

  await createAuditLog({
    actorId,
    action: "UPDATE_SUBJECT",
    targetType: "Subject",
    targetId: id,
    before: existing,
    after: subject,
    ipAddress: ip,
  });

  return subject;
}

// ═══════════════════════════════════════════════════
// TOPICS
// ═══════════════════════════════════════════════════

async function listTopicsBySubject(subjectId) {
  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError("Subject not found.", 404);

  return Topic.find({ subjectId, isActive: true }).sort({ sortOrder: 1 });
}

async function getTopicById(id) {
  const topic = await Topic.findById(id)
    .populate({
      path: 'subjectId',
      populate: [
        { path: 'classId', populate: { path: 'boardId' } },
        { path: 'moduleId', populate: { path: 'programId' } }
      ]
    })
    .populate({
      path: 'contentAssets',
      match: { publishState: 'PUBLISHED' },
      options: { sort: { createdAt: -1 } }
    })
    .populate('mcqSets');

  if (!topic) throw new AppError("Topic not found.", 404);
  return topic;
}

async function createTopic(data, actorId, ip) {
  const subject = await Subject.findById(data.subjectId);
  if (!subject) throw new AppError("Subject not found.", 404);

  const topic = await Topic.create(data);

  await createAuditLog({
    actorId,
    action: "CREATE_TOPIC",
    targetType: "Topic",
    targetId: topic._id.toString(),
    after: topic,
    ipAddress: ip,
  });

  return topic;
}

async function updateTopic(id, data, actorId, ip) {
  const existing = await Topic.findById(id);
  if (!existing) throw new AppError("Topic not found.", 404);

  const topic = await Topic.findByIdAndUpdate(id, data, { new: true });

  await createAuditLog({
    actorId,
    action: "UPDATE_TOPIC",
    targetType: "Topic",
    targetId: id,
    before: existing,
    after: topic,
    ipAddress: ip,
  });

  return topic;
}

// ═══════════════════════════════════════════════════
// TEACHER-SUBJECT ASSIGNMENT
// ═══════════════════════════════════════════════════

async function assignTeacherToSubject(teacherProfileId, subjectId, actorId, ip) {
  const teacher = await TeacherProfile.findById(teacherProfileId);
  if (!teacher) throw new AppError("Teacher not found.", 404);

  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError("Subject not found.", 404);

  const existingAssignment = await TeacherSubject.findOne({ subjectId });

  if (existingAssignment && existingAssignment.teacherId.toString() !== teacherProfileId) {
    throw new AppError("Another teacher is already assigned to this subject. Remove them first.", 409);
  }

  if (existingAssignment && existingAssignment.teacherId.toString() === teacherProfileId) {
    return existingAssignment;
  }

  const assignment = await TeacherSubject.create({
    teacherId: teacherProfileId,
    subjectId
  });

  await createAuditLog({
    actorId,
    action: "ASSIGN_TEACHER_SUBJECT",
    targetType: "TeacherSubject",
    targetId: assignment._id.toString(),
    after: { teacherProfileId, subjectId },
    ipAddress: ip,
  });

  return assignment;
}

async function removeTeacherFromSubject(teacherProfileId, subjectId, actorId, ip) {
  const assignment = await TeacherSubject.findOne({ teacherId: teacherProfileId, subjectId });

  if (!assignment) throw new AppError("Assignment not found.", 404);

  await TeacherSubject.findByIdAndDelete(assignment._id);

  await createAuditLog({
    actorId,
    action: "REMOVE_TEACHER_SUBJECT",
    targetType: "TeacherSubject",
    targetId: assignment._id.toString(),
    before: { teacherProfileId, subjectId },
    ipAddress: ip,
  });

  return { message: "Teacher removed from subject." };
}

module.exports = {
  listBoards,
  getBoardById,
  createBoard,
  updateBoard,
  listClassesByBoard,
  createClass,
  updateClass,
  listPrograms,
  createProgram,
  updateProgram,
  listModulesByProgram,
  createModule,
  listSubjectsByClass,
  listSubjectsByModule,
  createSubject,
  updateSubject,
  listTopicsBySubject,
  getTopicById,
  createTopic,
  updateTopic,
  assignTeacherToSubject,
  removeTeacherFromSubject,
};
