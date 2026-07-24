const Notification = require("../../models/Notification");
const User = require("../../models/User");
const config = require("../../config");
const logger = require("../../utils/logger");

// ═══════════════════════════════════════════════════
// EMAIL PROVIDER
// ═══════════════════════════════════════════════════

async function sendEmail(to, subject, body) {
  if (config.env !== "production" || !config.email.apiKey) {
    logger.info("[DEV] Email sent (mock)", { to, subject, preview: body.slice(0, 80) });
    return { sent: true, mock: true };
  }

  try {
    // Resend integration
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.email.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.email.from,
        to: [to],
        subject,
        html: body,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend API error: ${response.status} ${err}`);
    }

    return { sent: true };
  } catch (error) {
    logger.error("Email send failed", { to, subject, error: error.message });
    return { sent: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════
// SMS PROVIDER
// ═══════════════════════════════════════════════════

async function sendSMS(phone, message) {
  if (config.sms.provider === "mock" || !config.sms.apiKey) {
    logger.info("[DEV] SMS sent (mock)", { phone, preview: message.slice(0, 60) });
    return { sent: true, mock: true };
  }

  try {
    // Generic HTTP SMS gateway — replace with your provider's API
    // Twilio, Zong, or local Pakistan SMS gateway
    logger.info("SMS dispatch attempted", { phone });
    return { sent: true };
  } catch (error) {
    logger.error("SMS send failed", { phone, error: error.message });
    return { sent: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════
// NOTIFICATION DISPATCHER
// ═══════════════════════════════════════════════════

/**
 * Create a notification record and dispatch through the appropriate channel.
 * All notifications are persisted for the in-app notification bell.
 */
async function dispatch({ userId, type, subject, body, channel = "EMAIL" }) {
  // Persist to database for in-app display
  const notification = await Notification.create({
    userId,
    channel,
    type,
    subject,
    body,
  });

  // Fetch user contact info
  const user = await User.findById(userId).select('email phone');

  if (!user) {
    logger.warn("Notification target user not found", { userId, type });
    return notification;
  }

  let sendResult = { sent: false };

  if (channel === "EMAIL" && user.email) {
    sendResult = await sendEmail(user.email, subject, _wrapEmailTemplate(subject, body));
  } else if (channel === "SMS" && user.phone) {
    sendResult = await sendSMS(user.phone, `${subject}: ${body}`);
  }

  // Update notification record with send status
  await Notification.findByIdAndUpdate(notification._id, {
    [sendResult.sent ? 'sentAt' : 'failedAt']: new Date(),
  });

  return notification;
}

/**
 * Send a notification through multiple channels.
 * Primary channel always fires. Secondary fires only for critical types.
 */
async function dispatchMultiChannel({ userId, type, subject, body }) {
  // Primary: always email
  const emailNotif = await dispatch({ userId, type, subject, body, channel: "EMAIL" });

  // Secondary: SMS only for critical notifications
  const criticalTypes = [
    "PAYMENT_SUCCESS",
    "PAYMENT_FAILED",
    "ACCOUNT_SUSPENDED",
    "PARENT_ACTIVATION",
    "OTP_CODE",
  ];

  if (criticalTypes.includes(type)) {
    await dispatch({ userId, type, subject, body, channel: "SMS" });
  }

  return emailNotif;
}

// ═══════════════════════════════════════════════════
// PRE-BUILT NOTIFICATION TEMPLATES
// ═══════════════════════════════════════════════════

const templates = {
  async doubtResponse(studentUserId, doubtId, teacherName, topicTitle) {
    return dispatchMultiChannel({
      userId: studentUserId,
      type: "DOUBT_RESPONSE",
      subject: "Your doubt has been answered",
      body: `${teacherName} has responded to your question on "${topicTitle}". Log in to view the response.`,
    });
  },

  async liveSessionScheduled(studentUserId, teacherName, topicTitle, scheduledAt) {
    const timeStr = new Date(scheduledAt).toLocaleString("en-PK", {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    return dispatchMultiChannel({
      userId: studentUserId,
      type: "LIVE_SESSION_SCHEDULED",
      subject: `Live session scheduled: ${topicTitle}`,
      body: `${teacherName} has scheduled a live session on "${topicTitle}" for ${timeStr}. Don't miss it!`,
    });
  },

  async liveSessionStarted(studentUserId, teacherName, topicTitle) {
    return dispatch({
      userId: studentUserId,
      type: "LIVE_SESSION_STARTED",
      subject: `Live session starting now: ${topicTitle}`,
      body: `${teacherName} is going live on "${topicTitle}" right now. Join the session!`,
      channel: "EMAIL",
    });
  },

  async sessionRecordingAvailable(studentUserId, topicTitle) {
    return dispatch({
      userId: studentUserId,
      type: "SESSION_RECORDING_AVAILABLE",
      subject: `Recording available: ${topicTitle}`,
      body: `The recording for the live session on "${topicTitle}" is now available. Watch it anytime.`,
      channel: "EMAIL",
    });
  },

  async paymentSuccess(studentUserId, planName, amount) {
    return dispatchMultiChannel({
      userId: studentUserId,
      type: "PAYMENT_SUCCESS",
      subject: "Payment confirmed — enrollment active",
      body: `Your payment of PKR ${amount} for "${planName}" has been confirmed. Your enrollment is now active. Happy learning!`,
    });
  },

  async parentActivation(parentUserId, childName) {
    return dispatchMultiChannel({
      userId: parentUserId,
      type: "PARENT_ACTIVATION",
      subject: "Your parent dashboard is ready",
      body: `Your parent account has been activated. You can now monitor ${childName}'s learning progress through your dashboard.`,
    });
  },

  async accountSuspended(userId, reason) {
    return dispatchMultiChannel({
      userId,
      type: "ACCOUNT_SUSPENDED",
      subject: "Account suspended",
      body: `Your account has been suspended. Reason: ${reason || "Contact support for details."}.`,
    });
  },

  async accountReactivated(userId) {
    return dispatch({
      userId,
      type: "ACCOUNT_REACTIVATED",
      subject: "Account reactivated",
      body: "Your account has been reactivated. You can now log in and continue learning.",
      channel: "EMAIL",
    });
  },
};

// ═══════════════════════════════════════════════════
// USER NOTIFICATION QUERIES
// ═══════════════════════════════════════════════════

async function getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('id type subject body isRead channel createdAt'),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return { notifications, total, unreadCount };
}

async function markAsRead(notificationId, userId) {
  const notif = await Notification.findById(notificationId);

  if (!notif || notif.userId.toString() !== userId.toString()) return null;

  return Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
}

async function markAllAsRead(userId) {
  return Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
}

// ═══════════════════════════════════════════════════
// EMAIL TEMPLATE WRAPPER
// ═══════════════════════════════════════════════════

function _wrapEmailTemplate(subject, body) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <h2 style="margin:0;color:#1e3a5f;font-size:20px">LMS Platform</h2>
    </div>
    <div style="background:#fff;border-radius:12px;padding:32px 24px;border:1px solid #e2e8f0">
      <h3 style="margin:0 0 12px;color:#0f172a;font-size:16px">${subject}</h3>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6">${body}</p>
    </div>
    <p style="text-align:center;margin-top:24px;color:#94a3b8;font-size:12px">
      This is an automated message from LMS Platform. Do not reply to this email.
    </p>
  </div>
</body>
</html>`.trim();
}

module.exports = {
  dispatch,
  dispatchMultiChannel,
  templates,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  sendEmail,
  sendSMS,
};
