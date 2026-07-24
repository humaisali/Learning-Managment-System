const contentService = require("./content.service");
const { sendSuccess } = require("../../utils/apiResponse");
const TeacherProfile = require("../../models/TeacherProfile");
const StudentProfile = require("../../models/StudentProfile");

async function _getTeacherProfileId(userId) {
  const profile = await TeacherProfile.findOne({ userId });
  if (!profile) throw new Error("Teacher profile not found for this user.");
  return profile._id;
}

async function _getStudentProfileId(userId) {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) throw new Error("Student profile not found for this user.");
  return profile._id;
}

// ─── Teacher: Video Upload ─────────────────────
async function initiateVideoUpload(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await contentService.initiateVideoUpload(teacherId, req.body);
    return sendSuccess(res, result, "Upload URL generated.", 201);
  } catch (error) { next(error); }
}

async function confirmVideoUpload(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await contentService.confirmVideoUpload(req.params.id, teacherId, req.body);
    return sendSuccess(res, result, "Video upload confirmed.");
  } catch (error) { next(error); }
}

// ─── Teacher: Key Points ───────────────────────
async function saveKeyPoints(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await contentService.saveKeyPoints(teacherId, req.body);
    return sendSuccess(res, result, "Key points saved.", 201);
  } catch (error) { next(error); }
}

// ─── Teacher: Subjective Questions ─────────────
async function saveSubjectiveQuestion(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await contentService.saveSubjectiveQuestion(teacherId, req.body);
    return sendSuccess(res, result, "Subjective question saved.", 201);
  } catch (error) { next(error); }
}

// ─── Teacher: MCQs ─────────────────────────────
async function createMCQSet(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await contentService.createMCQSet(teacherId, req.body);
    return sendSuccess(res, result, "MCQ set created.", 201);
  } catch (error) { next(error); }
}

async function updateMCQSet(req, res, next) {
  try {
    const result = await contentService.updateMCQSet(req.params.id, req.body);
    return sendSuccess(res, result, "MCQ set updated.");
  } catch (error) { next(error); }
}

// ─── Teacher: Publish / Unpublish ──────────────
async function publishAsset(req, res, next) {
  try {
    const result = await contentService.publishAsset(req.params.id, req.user.id, req.clientIp);
    return sendSuccess(res, result, "Content published.");
  } catch (error) { next(error); }
}

async function unpublishAsset(req, res, next) {
  try {
    const result = await contentService.unpublishAsset(req.params.id, req.user.id, req.clientIp);
    return sendSuccess(res, result, "Content unpublished.");
  } catch (error) { next(error); }
}

// ─── Teacher: My Content ───────────────────────
async function listMyContent(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const { topicId, type, publishState } = req.query;
    const content = await contentService.listContentByTeacher(teacherId, {
      topicId, type, publishState,
    });
    return sendSuccess(res, content, "Content retrieved.");
  } catch (error) { next(error); }
}

// ─── Student: Topic Content ────────────────────
async function getTopicContent(req, res, next) {
  try {
    const result = await contentService.getTopicContent(req.params.topicId);
    return sendSuccess(res, result, "Topic content retrieved.");
  } catch (error) { next(error); }
}

// ─── Student: Playback URL ─────────────────────
async function getPlaybackUrl(req, res, next) {
  try {
    const result = await contentService.getPlaybackUrl(req.params.assetId, req.user.id);
    return sendSuccess(res, result, "Playback URL generated.");
  } catch (error) { next(error); }
}

// ─── Student: MCQ Attempt ──────────────────────
async function submitMCQAttempt(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const { mcqSetId, answers } = req.body;
    const result = await contentService.submitMCQAttempt(studentId, mcqSetId, answers);
    return sendSuccess(res, result, "MCQ submitted and scored.");
  } catch (error) { next(error); }
}

// ─── Student: MCQ Sets for Topic ───────────────
async function getMCQSets(req, res, next) {
  try {
    const sets = await contentService.getMCQSetsByTopic(req.params.topicId);
    return sendSuccess(res, sets, "MCQ sets retrieved.");
  } catch (error) { next(error); }
}

module.exports = {
  initiateVideoUpload, confirmVideoUpload,
  saveKeyPoints, saveSubjectiveQuestion,
  createMCQSet, updateMCQSet,
  publishAsset, unpublishAsset,
  listMyContent, getTopicContent, getPlaybackUrl,
  submitMCQAttempt, getMCQSets,
};
