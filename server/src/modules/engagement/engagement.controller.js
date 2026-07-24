const engagementService = require("./engagement.service");
const { sendSuccess } = require("../../utils/apiResponse");
const prisma = require("../../config/database");

async function _getStudentProfileId(userId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("Student profile not found.");
  return profile.id;
}

async function processHeartbeat(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const result = await engagementService.processHeartbeat(studentId, req.body);
    return sendSuccess(res, result, "Heartbeat recorded.");
  } catch (error) { next(error); }
}

async function getProgress(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const result = await engagementService.getStudentProgress(studentId);
    return sendSuccess(res, result, "Progress retrieved.");
  } catch (error) { next(error); }
}

async function getTopicProgress(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const result = await engagementService.getTopicProgress(studentId, req.params.topicId);
    return sendSuccess(res, result, "Topic progress retrieved.");
  } catch (error) { next(error); }
}

async function getAttentionScore(req, res, next) {
  try {
    // Parents call this for their child; students call for themselves
    let studentProfileId;

    if (req.user.role === "PARENT") {
      const link = await prisma.parentLink.findFirst({
        where: { parentId: req.user.id },
        include: { student: { include: { studentProfile: true } } },
      });
      if (!link || !link.student.studentProfile) {
        throw new Error("No linked student found.");
      }
      studentProfileId = link.student.studentProfile.id;
    } else {
      studentProfileId = await _getStudentProfileId(req.user.id);
    }

    const result = await engagementService.computeAttentionScore(studentProfileId);
    return sendSuccess(res, result, "Attention score computed.");
  } catch (error) { next(error); }
}

module.exports = { processHeartbeat, getProgress, getTopicProgress, getAttentionScore };
