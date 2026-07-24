const TeacherProfile = require("../../models/TeacherProfile");
const TeacherSubject = require("../../models/TeacherSubject");
const { AppError } = require("../../utils/apiResponse");

async function getAssignedSubjects(userId) {
  const profile = await TeacherProfile.findOne({ userId });
  if (!profile) throw new AppError("Teacher profile not found.", 404);

  const teacherSubjects = await TeacherSubject.find({ teacherId: profile._id })
    .populate({
      path: "subjectId",
      populate: [
        { path: "classId", select: "name" },
        { path: "moduleId", select: "name" },
        { path: "topics", select: "_id" }
      ]
    });

  return teacherSubjects.map((ts) => {
    const subject = ts.subjectId;
    if (!subject) return null;
    return {
      id: subject._id,
      name: subject.name,
      className: subject.classId?.name || null,
      moduleName: subject.moduleId?.name || null,
      topicCount: subject.topics ? subject.topics.length : 0,
    };
  }).filter(Boolean);
}

module.exports = {
  getAssignedSubjects,
};
