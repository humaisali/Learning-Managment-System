const { AppError } = require("../utils/apiResponse");
const logger = require("../utils/logger");
const config = require("../config");

/**
 * Request size limiter — rejects payloads larger than allowed.
 * Express built-in handles this, but this catches edge cases
 * and logs oversized attempts for monitoring.
 */
function requestSizeLimiter(maxSizeMB = 10) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (contentLength > maxBytes) {
      logger.warn("Oversized request rejected", {
        ip: req.clientIp,
        contentLength,
        maxBytes,
        url: req.originalUrl,
      });
      return next(new AppError(`Request body too large. Maximum ${maxSizeMB}MB.`, 413));
    }
    next();
  };
}

/**
 * Sanitize request body — strip dangerous HTML/script tags from string fields.
 * Prevents stored XSS even though React escapes on render.
 * Defense in depth — never trust a single layer.
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj) {
  if (typeof obj === "string") {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/javascript\s*:/gi, "");
  }

  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }

  if (obj && typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitize(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Security headers beyond what Helmet provides.
 * These are LMS-specific headers.
 */
function additionalSecurityHeaders(req, res, next) {
  // Prevent the browser from MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking — only allow same-origin framing
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Tell browser to use HTTPS
  if (config.env === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // Prevent information leakage
  res.removeHeader("X-Powered-By");

  // Permissions policy — restrict browser features
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  next();
}

/**
 * Suspicious request detector — logs and optionally blocks
 * requests that look like common attack patterns.
 */
function suspiciousRequestDetector(req, res, next) {
  const url = req.originalUrl.toLowerCase();
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();

  // Common attack paths
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /\/etc\/passwd/, // Linux file access
    /\/proc\/self/, // Process info
    /\bwp-admin\b/, // WordPress probing
    /\bphpmyadmin\b/, // phpMyAdmin probing
    /\.env(?:$|\/)/, // Env file access
    /\/\.git/, // Git directory access
    /\beval\s*\(/, // Code injection
    /union\s+select/i, // SQL injection
    /;\s*drop\s+table/i, // SQL injection
  ];

  const isSuspicious = suspiciousPatterns.some((p) => p.test(url));

  if (isSuspicious) {
    logger.warn("Suspicious request detected", {
      ip: req.clientIp,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.headers["user-agent"],
    });

    // In production, block immediately
    if (config.env === "production") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }
  }

  // Detect empty or bot user agents
  if (!userAgent || userAgent.length < 10) {
    logger.debug("Request with minimal user agent", {
      ip: req.clientIp,
      url: req.originalUrl,
      userAgent,
    });
  }

  next();
}

/**
 * CORS pre-flight cache — tells browsers to cache CORS
 * pre-flight responses to reduce OPTIONS requests.
 */
function corsPreflightCache(req, res, next) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  }
  next();
}

/**
 * Webhook signature verification middleware factory.
 * Used for Safepay and other webhook providers.
 */
function verifyWebhookSignature(secretEnvKey, headerName) {
  const crypto = require("crypto");

  return (req, res, next) => {
    const secret = config.safepay?.webhookSecret;
    if (!secret) {
      // In development without secrets, skip verification
      logger.debug("Webhook signature verification skipped (no secret configured)");
      return next();
    }

    const signature = req.headers[headerName];
    if (!signature) {
      logger.warn("Webhook received without signature header", {
        url: req.originalUrl,
        ip: req.clientIp,
      });
      return next(new AppError("Missing webhook signature.", 401));
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      logger.warn("Invalid webhook signature", {
        url: req.originalUrl,
        ip: req.clientIp,
      });
      return next(new AppError("Invalid webhook signature.", 403));
    }

    next();
  };
}

module.exports = {
  requestSizeLimiter,
  sanitizeBody,
  additionalSecurityHeaders,
  suspiciousRequestDetector,
  corsPreflightCache,
  verifyWebhookSignature,
};
