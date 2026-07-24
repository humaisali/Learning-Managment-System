const http = require("http");
const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { initializeSocket } = require("./socket");
const connectDB = require("./config/database");

const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize Socket.io on the same HTTP server
initializeSocket(server);

// Graceful shutdown handling
function shutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Unhandled rejection and exception handlers
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", { reason: reason?.message || reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { message: error.message, stack: error.stack });
  process.exit(1);
});

// Start
server.listen(config.port, () => {
  logger.info(`LMS API server running on port ${config.port} [${config.env}]`);
  logger.info(`Health check: http://localhost:${config.port}/api/health`);
});

module.exports = server;
