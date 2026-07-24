const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("../utils/logger");

let io = null;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, userRole } = socket;

    logger.debug("Socket connected", { userId, userRole, socketId: socket.id });

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);

    // Join role-based room
    socket.join(`role:${userRole}`);

    // Handle joining subject rooms (for teachers and students)
    socket.on("join:subject", (subjectId) => {
      socket.join(`subject:${subjectId}`);
      logger.debug("Joined subject room", { userId, subjectId });
    });

    // Handle joining live session rooms
    socket.on("join:live-session", (sessionId) => {
      socket.join(`live:${sessionId}`);
      logger.debug("Joined live session room", { userId, sessionId });
    });

    socket.on("leave:live-session", (sessionId) => {
      socket.leave(`live:${sessionId}`);
    });

    // Live session chat
    socket.on("live:chat:message", (data) => {
      const { sessionId, text } = data;

      if (!text || text.trim().length === 0) return;
      if (text.length > 500) return; // Message length limit

      const message = {
        userId,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      io.to(`live:${sessionId}`).emit("live:chat:message", message);
    });

    // Engagement heartbeat (alternative to REST endpoint)
    socket.on("engagement:heartbeat", (data) => {
      // Forward to engagement handler
      // This is handled in the engagement module
      socket.emit("engagement:heartbeat:ack", { received: true });
    });

    socket.on("disconnect", () => {
      logger.debug("Socket disconnected", { userId, socketId: socket.id });
    });
  });

  logger.info("Socket.io server initialized");

  return io;
}

/**
 * Get the Socket.io server instance.
 * Used by services to emit events.
 */
function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initializeSocket first.");
  }
  return io;
}

/**
 * Emit a notification to a specific user.
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emit to all users with a specific role.
 */
function emitToRole(role, event, data) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

/**
 * Emit to all users in a subject room.
 */
function emitToSubject(subjectId, event, data) {
  if (io) {
    io.to(`subject:${subjectId}`).emit(event, data);
  }
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToSubject,
};
