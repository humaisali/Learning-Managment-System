const studentService = require("./student.service");
const { sendSuccess } = require("../../utils/apiResponse");
const StudentProfile = require("../../models/StudentProfile");

async function _getStudentProfileId(userId) {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) throw new Error("Student profile not found.");
  return profile._id;
}

async function getDashboard(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const result = await studentService.getDashboard(studentId);
    return sendSuccess(res, result, "Dashboard loaded.");
  } catch (error) { next(error); }
}

async function getEnrolledSubjects(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const result = await studentService.getEnrolledSubjects(studentId);
    return sendSuccess(res, result, "Subjects retrieved.");
  } catch (error) { next(error); }
}

async function getSubjectTopics(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const result = await studentService.getSubjectTopics(studentId, req.params.subjectId);
    return sendSuccess(res, result, "Topics retrieved.");
  } catch (error) { next(error); }
}

module.exports = { getDashboard, getEnrolledSubjects, getSubjectTopics };
