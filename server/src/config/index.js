require("dotenv").config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  db: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3,
  },

  safepay: {
    apiKey: process.env.SAFEPAY_API_KEY,
    secret: process.env.SAFEPAY_SECRET,
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET,
    sandbox: process.env.SAFEPAY_SANDBOX === "true",
  },

  bunny: {
    apiKey: process.env.BUNNY_API_KEY,
    libraryId: process.env.BUNNY_LIBRARY_ID,
    cdnHostname: process.env.BUNNY_CDN_HOSTNAME,
  },

  mux: {
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
  },

  email: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || "noreply@yourlms.com",
  },

  sms: {
    provider: process.env.SMS_PROVIDER || "mock",
    apiKey: process.env.SMS_API_KEY,
    senderId: process.env.SMS_SENDER_ID || "LMS",
  },
};

// Validate critical config in production
if (config.env === "production") {
  const required = [
    ["DATABASE_URL", config.db.url],
    ["JWT_ACCESS_SECRET", config.jwt.accessSecret],
    ["JWT_REFRESH_SECRET", config.jwt.refreshSecret],
  ];

  const missing = required.filter(([, val]) => !val).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

module.exports = config;
