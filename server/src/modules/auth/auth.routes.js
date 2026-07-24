const { Router } = require("express");
const authController = require("./auth.controller");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { authLimiter, otpLimiter } = require("../../middleware/rateLimiter");
const {
  registerSchema,
  loginEmailSchema,
  loginPhoneSchema,
  requestOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./auth.schema");

const router = Router();

// Public routes
router.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  authController.register
);

router.post(
  "/login/email",
  authLimiter,
  validate({ body: loginEmailSchema }),
  authController.loginWithEmail
);

router.post(
  "/login/phone",
  authLimiter,
  validate({ body: loginPhoneSchema }),
  authController.loginWithPhone
);

router.post(
  "/request-otp",
  otpLimiter,
  validate({ body: requestOtpSchema }),
  authController.requestOTP
);

router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

// Token refresh (uses refresh token cookie)
router.post("/refresh", authController.refreshToken);

// Protected routes
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
