const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter — 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Strict limiter for auth endpoints — 10 requests per 15 minutes per IP.
 * Prevents brute-force login and OTP attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please wait 15 minutes.",
  },
});

/**
 * OTP-specific limiter — 3 requests per 5 minutes per IP.
 */
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "OTP request limit reached. Please wait 5 minutes.",
  },
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
