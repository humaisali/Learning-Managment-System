const engagementService = require("./engagement.service");
const { sendSuccess } = require("../../utils/apiResponse");
const StudentProfile = require("../../models/StudentProfile");
const ParentLink = require("../../models/ParentLink");

async function _getStudentProfileId(userId) {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) throw new Error("Student profile not found.");
  return profile._id;
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
      const link = await ParentLink.findOne({ parentId: req.user.id })
        .populate({
          path: 'studentId',
          select: 'id'
        });
      
      if (!link) {
        throw new Error("No linked student found.");
      }
      
      // Need to find the student profile based on the linked student's user ID
      const profile = await StudentProfile.findOne({ userId: link.studentId });
      if (!profile) {
        throw new Error("Student profile not found.");
      }
      studentProfileId = profile._id;
    } else {
      studentProfileId = await _getStudentProfileId(req.user.id);
    }

    const result = await engagementService.computeAttentionScore(studentProfileId);
    return sendSuccess(res, result, "Attention score computed.");
  } catch (error) { next(error); }
}

module.exports = { processHeartbeat, getProgress, getTopicProgress, getAttentionScore };
