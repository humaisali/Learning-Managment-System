const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../../models/User");
const OTPCode = require("../../models/OTPCode");
const RefreshToken = require("../../models/RefreshToken");
const StudentProfile = require("../../models/StudentProfile");
const TeacherProfile = require("../../models/TeacherProfile");

const config = require("../../config");
const { AppError } = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const BCRYPT_ROUNDS = 12;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signAccessToken(userId, role) {
  return jwt.sign(
    { userId, role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { userId, type: "refresh" },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

async function storeRefreshToken(userId, token) {
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await RefreshToken.create({ userId, token, expiresAt });
}

async function issueTokens(user, res) {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  await storeRefreshToken(user._id, refreshToken);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth/refresh",
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      avatar: user.avatar,
    },
  };
}

async function register(data) {
  if (data.email) {
    const existingEmail = await User.findOne({ email: data.email });
    if (existingEmail) {
      throw new AppError("An account with this email already exists.", 409);
    }
  }

  if (data.phone) {
    const existingPhone = await User.findOne({ phone: data.phone });
    if (existingPhone) {
      throw new AppError("An account with this phone number already exists.", 409);
    }
  }

  let passwordHash = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  try {
    const newUser = await User.create({
      email: data.email || null,
      phone: data.phone || null,
      passwordHash,
      fullName: data.fullName,
      role: data.role || "STUDENT",
    });

    if (newUser.role === "STUDENT") {
      await StudentProfile.create({ userId: newUser._id });
    } else if (newUser.role === "CENTRAL_TEACHER" || newUser.role === "SUBJECT_TEACHER") {
      await TeacherProfile.create({
        userId: newUser._id,
        teacherType: newUser.role === "CENTRAL_TEACHER" ? "CENTRAL" : "SUBJECT",
      });
    }

    logger.info("User registered", { userId: newUser._id, role: newUser.role });
    return newUser;
  } catch (error) {
    throw error;
  }
}

async function loginWithEmail(email, password) {
  const user = await User.findOne({ email });

  if (!user || !user.passwordHash) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account has been deactivated.", 403);
  }

  if (user.isSuspended) {
    throw new AppError("Account is suspended. Contact support.", 403);
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError("Invalid email or password.", 401);
  }

  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  return user;
}

async function loginWithPhone(phone, code) {
  const otpRecord = await OTPCode.findOne({
    phone,
    code,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new AppError("Invalid or expired OTP code.", 401);
  }

  if (otpRecord.attempts >= config.otp.maxAttempts) {
    throw new AppError("Maximum OTP attempts exceeded. Request a new code.", 429);
  }

  await OTPCode.findByIdAndUpdate(otpRecord._id, { usedAt: new Date() });

  const user = await User.findOne({ phone });

  if (!user) {
    throw new AppError("No account found with this phone number.", 404);
  }

  if (!user.isActive) {
    throw new AppError("Account has been deactivated.", 403);
  }

  if (user.isSuspended) {
    throw new AppError("Account is suspended. Contact support.", 403);
  }

  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  return user;
}

async function requestOTP(phone) {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  const user = await User.findOne({ phone });

  await OTPCode.create({
    phone,
    code,
    userId: user ? user._id : null,
    expiresAt,
  });

  if (config.env !== "production") {
    logger.info(`[DEV] OTP for ${phone}: ${code}`);
  }

  return { message: "OTP sent successfully", expiresInMinutes: config.otp.expiryMinutes };
}

async function refreshAccessToken(refreshTokenValue) {
  let decoded;
  try {
    decoded = jwt.verify(refreshTokenValue, config.jwt.refreshSecret);
  } catch {
    throw new AppError("Invalid refresh token.", 401);
  }

  const storedToken = await RefreshToken.findOne({ token: refreshTokenValue }).populate('userId');

  if (!storedToken || storedToken.revokedAt) {
    throw new AppError("Refresh token has been revoked.", 401);
  }

  if (new Date() > storedToken.expiresAt) {
    throw new AppError("Refresh token has expired.", 401);
  }

  const user = storedToken.userId;

  if (!user.isActive || user.isSuspended) {
    throw new AppError("Account is not accessible.", 403);
  }

  await RefreshToken.findByIdAndUpdate(storedToken._id, { revokedAt: new Date() });

  return user;
}

async function forgotPassword(email) {
  const user = await User.findOne({ email });

  if (!user) {
    return { message: "If an account exists with this email, a reset link has been sent." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await OTPCode.create({
    phone: `reset:${email}`,
    code: resetTokenHash,
    userId: user._id,
    expiresAt,
  });

  if (config.env !== "production") {
    logger.info(`[DEV] Password reset token for ${email}: ${resetToken}`);
  }

  return { message: "If an account exists with this email, a reset link has been sent." };
}

async function resetPassword(token, newPassword) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const otpRecord = await OTPCode.findOne({
    code: tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate('userId');

  if (!otpRecord || !otpRecord.userId) {
    throw new AppError("Invalid or expired reset token.", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  
  try {
    await User.findByIdAndUpdate(otpRecord.userId._id, { passwordHash });
    await OTPCode.findByIdAndUpdate(otpRecord._id, { usedAt: new Date() });
    await RefreshToken.updateMany(
      { userId: otpRecord.userId._id, revokedAt: null },
      { revokedAt: new Date() }
    );
  } catch (err) {
    throw err;
  }

  return { message: "Password has been reset successfully." };
}

async function logout(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
}

module.exports = {
  register,
  loginWithEmail,
  loginWithPhone,
  requestOTP,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  logout,
  issueTokens,
};
