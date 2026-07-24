const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Deep health check — verifies all critical dependencies.
 * Used by load balancers and monitoring systems.
 * 
 * GET /api/health/deep
 * Returns 200 if all healthy, 503 if any dependency is down.
 */
async function deepHealthCheck(req, res) {
  const checks = {
    server: { status: "healthy", latency: 0 },
    database: { status: "unknown", latency: 0 },
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
  };

  let allHealthy = true;

  // Database check
  try {
    const dbStart = Date.now();
    // 1 indicates connected
    if (mongoose.connection.readyState === 1) {
      // Perform a ping
      await mongoose.connection.db.admin().ping();
      checks.database = {
        status: "healthy",
        latency: Date.now() - dbStart,
      };
    } else {
      throw new Error("Mongoose is not connected");
    }
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      error: error.message,
      latency: 0,
    };
    allHealthy = false;
    logger.error("Health check: database unhealthy", { error: error.message });
  }

  const statusCode = allHealthy ? 200 : 503;

  return res.status(statusCode).json({
    success: allHealthy,
    status: allHealthy ? "healthy" : "degraded",
    checks,
  });
}

/**
 * Lightweight liveness probe — just confirms the process is running.
 * Used by container orchestrators (Docker, K8s) for restart decisions.
 * 
 * GET /api/health/live
 */
function livenessProbe(req, res) {
  res.status(200).json({ alive: true });
}

/**
 * Readiness probe — confirms the server can handle requests.
 * 
 * GET /api/health/ready
 */
async function readinessProbe(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false });
    }
  } catch {
    res.status(503).json({ ready: false });
  }
}

module.exports = { deepHealthCheck, livenessProbe, readinessProbe };
