const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const { AppError } = require("../utils/apiResponse");

/**
 * Verifies the JWT access token from cookies or Authorization header.
 * Attaches the full user object (minus password) to req.user.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check httpOnly cookie first, then Authorization header
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      throw new AppError("Authentication required. Please log in.", 401);
    }

    // Verify token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("Session expired. Please log in again.", 401);
      }
      throw new AppError("Invalid authentication token.", 401);
    }

    // Fetch the user to confirm they still exist and are active
    const user = await User.findById(decoded.userId).select(
      "email phone fullName role isActive isSuspended avatar"
    );

    if (!user) {
      throw new AppError("User account no longer exists.", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account has been deactivated.", 403);
    }

    if (user.isSuspended) {
      throw new AppError("Account is currently suspended. Contact support.", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication — doesn't fail if no token present,
 * but attaches user if valid token exists.
 */
async function optionalAuth(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      const user = await User.findById(decoded.userId).select(
        "email phone fullName role isActive isSuspended"
      );

      if (user && user.isActive && !user.isSuspended) {
        req.user = user;
      }
    }
  } catch {
    // Silently ignore auth errors for optional routes
  }

  next();
}

module.exports = { authenticate, optionalAuth };
