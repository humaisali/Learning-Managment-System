const authService = require("./auth.service");
const { sendSuccess } = require("../../utils/apiResponse");

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    const tokens = await authService.issueTokens(user, res);

    return sendSuccess(res, tokens, "Registration successful.", 201);
  } catch (error) {
    next(error);
  }
}

async function loginWithEmail(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.loginWithEmail(email, password);
    const tokens = await authService.issueTokens(user, res);

    return sendSuccess(res, tokens, "Login successful.");
  } catch (error) {
    next(error);
  }
}

async function loginWithPhone(req, res, next) {
  try {
    const { phone, code } = req.body;
    const user = await authService.loginWithPhone(phone, code);
    const tokens = await authService.issueTokens(user, res);

    return sendSuccess(res, tokens, "Login successful.");
  } catch (error) {
    next(error);
  }
}

async function requestOTP(req, res, next) {
  try {
    const result = await authService.requestOTP(req.body.phone);
    return sendSuccess(res, result, "OTP sent.");
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return sendSuccess(res, null, "No refresh token provided.", 401);
    }

    const user = await authService.refreshAccessToken(token);
    const tokens = await authService.issueTokens(user, res);

    return sendSuccess(res, tokens, "Token refreshed.");
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, null, result.message);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    return sendSuccess(res, null, result.message);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/v1/auth/refresh" });

    return sendSuccess(res, null, "Logged out successfully.");
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    return sendSuccess(res, { user: req.user }, "Profile retrieved.");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  loginWithEmail,
  loginWithPhone,
  requestOTP,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
};
