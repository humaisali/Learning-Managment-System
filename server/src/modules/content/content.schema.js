const { z } = require("zod");

const createVideoAssetSchema = z.object({
  topicId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid topic ID"),
  title: z.string().min(1).max(300).trim(),
  filename: z.string().min(1, "Filename is required"),
});

const saveKeyPointsSchema = z.object({
  topicId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid topic ID"),
  title: z.string().min(1).max(300).trim(),
  textContent: z.string().min(10, "Key points must be at least 10 characters").max(50000),
});

const createMCQSetSchema = z.object({
  topicId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid topic ID"),
  questions: z
    .array(
      z.object({
        question: z.string().min(5, "Question text required"),
        options: z.array(z.string().min(1)).min(2).max(6),
        correctIndex: z.number().int().min(0),
      })
    )
    .min(1, "At least one question is required")
    .max(50),
});

const submitMCQAttemptSchema = z.object({
  mcqSetId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MCQ set ID"),
  answers: z.array(z.number().int().min(-1)).min(1),
});

const publishAssetSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid asset ID"),
});

const updateVideoMetadataSchema = z.object({
  videoId: z.string().min(1, "Video ID from provider is required"),
  duration: z.number().int().min(0).optional(),
});

const createSubjectiveQuestionSchema = z.object({
  topicId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid topic ID"),
  title: z.string().min(1).max(300).trim(),
  textContent: z.string().min(10, "Question text required").max(10000),
});

module.exports = {
  createVideoAssetSchema,
  saveKeyPointsSchema,
  createMCQSetSchema,
  submitMCQAttemptSchema,
  publishAssetSchema,
  updateVideoMetadataSchema,
  createSubjectiveQuestionSchema,
};
