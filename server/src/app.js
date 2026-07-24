const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { attachClientIp } = require("./middleware/audit");
const {
  additionalSecurityHeaders,
  sanitizeBody,
  suspiciousRequestDetector,
  corsPreflightCache,
  requestSizeLimiter,
} = require("./middleware/security");

// Route imports — Phase 1
const authRoutes = require("./modules/auth/auth.routes");
const catalogRoutes = require("./modules/catalog/catalog.routes");
const usersRoutes = require("./modules/users/users.routes");
const enrollmentRoutes = require("./modules/enrollment/enrollment.routes");
const paymentRoutes = require("./modules/payment/payment.routes");

// Route imports — Phase 2: Learning Core
const contentRoutes = require("./modules/content/content.routes");
const studentRoutes = require("./modules/student/student.routes");
const teacherRoutes = require("./modules/teacher/teacher.routes");
const engagementRoutes = require("./modules/engagement/engagement.routes");

// Route imports — Phase 3: Support Workflows
const doubtRoutes = require("./modules/doubt/doubt.routes");
const liveSessionRoutes = require("./modules/live-session/liveSession.routes");
const notificationRoutes = require("./modules/notification/notification.routes");

// Route imports — Phase 4: Visibility & Operations
const parentRoutes = require("./modules/parent/parent.routes");
const { adminRouter, complaintRouter } = require("./modules/admin/admin.routes");
const reportsRoutes = require("./modules/reports/reports.routes");

const app = express();

// ─── Security Headers ───────────────────────────
app.use(helmet({
  contentSecurityPolicy: config.env === "production" ? undefined : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(additionalSecurityHeaders);
app.use(corsPreflightCache);

// ─── CORS ───────────────────────────────────────
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Body Parsing ───────────────────────────────
app.use(requestSizeLimiter(10));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(sanitizeBody);

// ─── Security Scanning ─────────────────────────
app.use(suspiciousRequestDetector);

// ─── Request Logging ────────────────────────────
if (config.env !== "test") {
  app.use(morgan(config.env === "production" ? "combined" : "dev"));
}

// ─── Client IP Tracking ─────────────────────────
app.use(attachClientIp);

// ─── Rate Limiting ──────────────────────────────
app.use("/api/", apiLimiter);

// ─── Health & Monitoring ────────────────────────
const { deepHealthCheck, livenessProbe, readinessProbe } = require("./utils/healthCheck");

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LMS API is running",
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});
app.get("/api/health/deep", deepHealthCheck);
app.get("/api/health/live", livenessProbe);
app.get("/api/health/ready", readinessProbe);

// ─── API Routes (Phase 1) ───────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/enrollment", enrollmentRoutes);
app.use("/api/v1/payment", paymentRoutes);

// ─── API Routes (Phase 2: Learning Core) ────────
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/student", studentRoutes);
app.use("/api/v1/teacher", teacherRoutes);
app.use("/api/v1/engagement", engagementRoutes);

// ─── API Routes (Phase 3: Support Workflows) ────
app.use("/api/v1/doubts", doubtRoutes);
app.use("/api/v1/live", liveSessionRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// ─── API Routes (Phase 4: Visibility & Ops) ─────
app.use("/api/v1/parent", parentRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/complaints", complaintRouter);
app.use("/api/v1/reports", reportsRoutes);

// ─── Root Route ─────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the LMS API Server"
  });
});

// ─── 404 Handler ────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler (must be last) ────────
app.use(errorHandler);

module.exports = app;
