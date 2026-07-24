const { z } = require("zod");

const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim()
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .optional(),
  role: z
    .enum(["STUDENT", "PARENT", "CENTRAL_TEACHER", "SUBJECT_TEACHER", "HEAD_OFFICE", "SYSTEM_ADMIN"])
    .default("STUDENT"),
}).refine(
  (data) => data.email || data.phone,
  { message: "Either email or phone number is required", path: ["email"] }
).refine(
  (data) => {
    // If registering with email, password is required
    if (data.email && !data.phone) return !!data.password;
    return true;
  },
  { message: "Password is required for email registration", path: ["password"] }
);

const loginEmailSchema = z.object({
  email: z.string().email("Invalid email").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

const loginPhoneSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email").toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

module.exports = {
  registerSchema,
  loginEmailSchema,
  loginPhoneSchema,
  requestOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
};
