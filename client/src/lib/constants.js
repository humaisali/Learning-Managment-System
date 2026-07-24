export const API_BASE_URL = "/api/v1";

export const ROLES = {
  STUDENT: "STUDENT",
  PARENT: "PARENT",
  CENTRAL_TEACHER: "CENTRAL_TEACHER",
  SUBJECT_TEACHER: "SUBJECT_TEACHER",
  HEAD_OFFICE: "HEAD_OFFICE",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
};

export const ROLE_LABELS = {
  STUDENT: "Student",
  PARENT: "Parent",
  CENTRAL_TEACHER: "Central Teacher",
  SUBJECT_TEACHER: "Subject Teacher",
  HEAD_OFFICE: "Head Office",
  SYSTEM_ADMIN: "System Admin",
};

export const ENROLLMENT_STATUS = {
  PENDING: { label: "Pending", color: "text-yellow-600 bg-yellow-50" },
  ACTIVE: { label: "Active", color: "text-green-600 bg-green-50" },
  SUSPENDED: { label: "Suspended", color: "text-red-600 bg-red-50" },
  EXPIRED: { label: "Expired", color: "text-gray-600 bg-gray-50" },
  CANCELLED: { label: "Cancelled", color: "text-gray-600 bg-gray-50" },
};

export const PAYMENT_STATUS = {
  INITIATED: { label: "Initiated", color: "text-blue-600 bg-blue-50" },
  PENDING: { label: "Pending", color: "text-yellow-600 bg-yellow-50" },
  CONFIRMED: { label: "Confirmed", color: "text-green-600 bg-green-50" },
  FAILED: { label: "Failed", color: "text-red-600 bg-red-50" },
  REFUNDED: { label: "Refunded", color: "text-purple-600 bg-purple-50" },
};

export const DOUBT_STATUS = {
  NEW: { label: "New", color: "text-blue-600 bg-blue-50" },
  ANSWERED: { label: "Answered", color: "text-green-600 bg-green-50" },
  ESCALATED: { label: "Escalated", color: "text-orange-600 bg-orange-50" },
  CLOSED: { label: "Closed", color: "text-gray-600 bg-gray-50" },
  LIVE_SESSION_RECOMMENDED: { label: "Live Session", color: "text-purple-600 bg-purple-50" },
};

export const ATTENTION_SCORE = {
  HIGH: { min: 70, label: "Active Learner", color: "text-green-600", bg: "bg-green-500" },
  MEDIUM: { min: 40, label: "Needs Attention", color: "text-yellow-600", bg: "bg-yellow-500" },
  LOW: { min: 0, label: "Low Engagement", color: "text-red-600", bg: "bg-red-500" },
};

export function getAttentionLevel(score) {
  if (score >= 70) return ATTENTION_SCORE.HIGH;
  if (score >= 40) return ATTENTION_SCORE.MEDIUM;
  return ATTENTION_SCORE.LOW;
}

export const ROLE_DASHBOARD_PATHS = {
  STUDENT: "/student",
  PARENT: "/parent",
  CENTRAL_TEACHER: "/teacher",
  SUBJECT_TEACHER: "/teacher",
  HEAD_OFFICE: "/admin",
  SYSTEM_ADMIN: "/admin",
};
