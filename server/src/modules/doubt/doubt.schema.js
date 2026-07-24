const { z } = require("zod");

const submitDoubtSchema = z.object({
  topicId: z.string().uuid("Invalid topic ID"),
  text: z.string()
    .min(20, "Doubt must be at least 20 characters to prevent spam")
    .max(2000, "Doubt text is too long (max 2000 characters)")
    .trim(),
});

const respondToDoubtSchema = z.object({
  text: z.string().max(5000).trim().optional(),
  clipUrl: z.string().url().optional(),
}).refine(
  (data) => data.text || data.clipUrl,
  { message: "Either text response or video clip URL is required" }
);

const updateDoubtStatusSchema = z.object({
  status: z.enum(["ANSWERED", "ESCALATED", "CLOSED", "LIVE_SESSION_RECOMMENDED"]),
});

const doubtListQuerySchema = z.object({
  status: z.enum(["NEW", "ANSWERED", "ESCALATED", "CLOSED", "LIVE_SESSION_RECOMMENDED"]).optional(),
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).passthrough();

module.exports = {
  submitDoubtSchema,
  respondToDoubtSchema,
  updateDoubtStatusSchema,
  doubtListQuerySchema,
};
