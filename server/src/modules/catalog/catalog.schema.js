const { z } = require("zod");

const createBoardSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const updateBoardSchema = createBoardSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const createClassSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  boardId: z.string().uuid("Invalid board ID"),
  sortOrder: z.number().int().min(0).default(0),
});

const updateClassSchema = createClassSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const createProgramSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const updateProgramSchema = createProgramSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const createModuleSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  programId: z.string().uuid("Invalid program ID"),
  sortOrder: z.number().int().min(0).default(0),
});

const updateModuleSchema = createModuleSchema.partial().extend({});

const createSubjectSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  classId: z.string().uuid().optional().nullable(),
  moduleId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
}).refine(
  (data) => data.classId || data.moduleId,
  { message: "Either classId or moduleId is required", path: ["classId"] }
);

const updateSubjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const createTopicSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  subjectId: z.string().uuid("Invalid subject ID"),
  sortOrder: z.number().int().min(0).default(0),
});

const updateTopicSchema = z.object({
  title: z.string().min(1).max(300).trim().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

module.exports = {
  createBoardSchema,
  updateBoardSchema,
  createClassSchema,
  updateClassSchema,
  createProgramSchema,
  updateProgramSchema,
  createModuleSchema,
  updateModuleSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createTopicSchema,
  updateTopicSchema,
  idParamSchema,
};
