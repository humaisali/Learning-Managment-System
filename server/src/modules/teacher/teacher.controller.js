const teacherService = require("./teacher.service");
const { sendSuccess } = require("../../utils/apiResponse");

async function getAssignedSubjects(req, res, next) {
  try {
    const subjects = await teacherService.getAssignedSubjects(req.user.id);
    return sendSuccess(res, subjects, "Teacher subjects retrieved.");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAssignedSubjects,
};
