const mongoose = require("mongoose");
const { AppError } = require("../../utils/apiResponse");
const { createAuditLog } = require("../../middleware/audit");
const cloudinary = require('cloudinary').v2;
const config = require("../../config");

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});
const logger = require("../../utils/logger");

const Topic = require("../../models/Topic");
const ContentAsset = require("../../models/ContentAsset");
const TeacherProfile = require("../../models/TeacherProfile");
const TeacherSubject = require("../../models/TeacherSubject");
const MCQSet = require("../../models/MCQSet");
const MCQAttempt = require("../../models/MCQAttempt");
const EngagementEvent = require("../../models/EngagementEvent");

// ═══════════════════════════════════════════════════
// VIDEO CONTENT
// ═══════════════════════════════════════════════════

async function initiateVideoUpload(teacherProfileId, data) {
  const topic = await Topic.findById(data.topicId);
  if (!topic) throw new AppError("Topic not found.", 404);

  await _verifyTeacherSubjectAccess(teacherProfileId, topic.subjectId);

  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request({
    timestamp,
    folder: 'lms_videos'
  }, config.cloudinary.apiSecret);

  const asset = await ContentAsset.create({
    topicId: data.topicId,
    teacherId: teacherProfileId,
    type: "VIDEO",
    title: data.title,
    fileUrl: "pending", // Will be updated on confirm
    publishState: "DRAFT",
  });

  logger.info("Video upload initiated", {
    assetId: asset._id,
    teacherId: teacherProfileId,
  });

  return {
    assetId: asset._id,
    signature,
    timestamp,
    cloudName: config.cloudinary.cloudName,
    apiKey: config.cloudinary.apiKey,
    folder: 'lms_videos'
  };
}

async function confirmVideoUpload(assetId, teacherProfileId, metadata) {
  const asset = await ContentAsset.findById(assetId);
  if (!asset) throw new AppError("Content asset not found.", 404);
  if (asset.teacherId.toString() !== teacherProfileId.toString()) {
    throw new AppError("You can only update your own uploads.", 403);
  }

  const updated = await ContentAsset.findByIdAndUpdate(
    assetId,
    { 
      fileUrl: metadata.fileUrl, 
      duration: metadata.duration || 0 
    },
    { new: true }
  );

  return updated;
}

async function getPlaybackUrl(assetId, userId) {
  const asset = await ContentAsset.findById(assetId)
    .populate({ path: 'topicId', populate: { path: 'subjectId' } });

  if (!asset) throw new AppError("Content not found.", 404);
  if (asset.publishState !== "PUBLISHED") {
    throw new AppError("This content is not currently available.", 404);
  }
  if (asset.type !== "VIDEO") {
    throw new AppError("Playback URL only available for video content.", 400);
  }

  // Optimize Cloudinary URLs for smoother streaming
  let optimizedUrl = asset.fileUrl;
  if (optimizedUrl && optimizedUrl.includes('res.cloudinary.com') && optimizedUrl.includes('/upload/')) {
    // Prevent double injection if it already has transformations
    if (!optimizedUrl.includes('/upload/q_auto')) {
      optimizedUrl = optimizedUrl.replace('/upload/', '/upload/q_auto,f_auto,vc_auto/');
    }
  }

  return {
    playbackUrl: optimizedUrl,
    assetId: asset._id,
    title: asset.title,
    duration: asset.duration,
  };
}

// ═══════════════════════════════════════════════════
// KEY POINTS
// ═══════════════════════════════════════════════════

async function saveKeyPoints(teacherProfileId, data) {
  const topic = await Topic.findById(data.topicId);
  if (!topic) throw new AppError("Topic not found.", 404);

  await _verifyTeacherSubjectAccess(teacherProfileId, topic.subjectId);

  const existing = await ContentAsset.findOne({
    topicId: data.topicId,
    type: "KEY_POINTS",
    teacherId: teacherProfileId,
  });

  if (existing) {
    const updated = await ContentAsset.findByIdAndUpdate(
      existing._id,
      {
        title: data.title,
        textContent: data.textContent,
        $inc: { version: 1 },
      },
      { new: true }
    );
    return updated;
  }

  const asset = await ContentAsset.create({
    topicId: data.topicId,
    teacherId: teacherProfileId,
    type: "KEY_POINTS",
    title: data.title,
    textContent: data.textContent,
    publishState: "DRAFT",
  });

  return asset;
}

// ═══════════════════════════════════════════════════
// SUBJECTIVE QUESTIONS
// ═══════════════════════════════════════════════════

async function saveSubjectiveQuestion(teacherProfileId, data) {
  const topic = await Topic.findById(data.topicId);
  if (!topic) throw new AppError("Topic not found.", 404);

  await _verifyTeacherSubjectAccess(teacherProfileId, topic.subjectId);

  const asset = await ContentAsset.create({
    topicId: data.topicId,
    teacherId: teacherProfileId,
    type: "SUBJECTIVE_QUESTION",
    title: data.title,
    textContent: data.textContent,
    publishState: "DRAFT",
  });

  return asset;
}

// ═══════════════════════════════════════════════════
// MCQ MANAGEMENT
// ═══════════════════════════════════════════════════

async function createMCQSet(teacherProfileId, data) {
  const topic = await Topic.findById(data.topicId).populate('subjectId');
  if (!topic) throw new AppError("Topic not found.", 404);

  await _verifyTeacherSubjectAccess(teacherProfileId, topic.subjectId);

  for (const q of data.questions) {
    if (q.correctIndex >= q.options.length) {
      throw new AppError(
        `correctIndex ${q.correctIndex} is out of bounds for question "${q.question}"`,
        422
      );
    }
  }

  const mcqSet = await MCQSet.create({
    topicId: data.topicId,
    questions: data.questions,
  });

  return mcqSet;
}

async function updateMCQSet(mcqSetId, data) {
  const existing = await MCQSet.findById(mcqSetId);
  if (!existing) throw new AppError("MCQ set not found.", 404);

  for (const q of data.questions) {
    if (q.correctIndex >= q.options.length) {
      throw new AppError(
        `correctIndex ${q.correctIndex} is out of bounds for question "${q.question}"`,
        422
      );
    }
  }

  const updated = await MCQSet.findByIdAndUpdate(
    mcqSetId,
    { questions: data.questions },
    { new: true }
  );

  return updated;
}

async function getMCQSetsByTopic(topicId) {
  return MCQSet.find({ topicId }).sort({ createdAt: -1 });
}

async function submitMCQAttempt(studentProfileId, mcqSetId, answers) {
  const mcqSet = await MCQSet.findById(mcqSetId);
  if (!mcqSet) throw new AppError("MCQ set not found.", 404);

  const questions = mcqSet.questions;

  if (answers.length !== questions.length) {
    throw new AppError(
      `Expected ${questions.length} answers but received ${answers.length}.`,
      422
    );
  }

  let correct = 0;
  const results = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) correct++;
    return {
      questionIndex: i,
      selected: answers[i],
      correct: q.correctIndex,
      isCorrect,
    };
  });

  const score = Math.round((correct / questions.length) * 100);

  const attempt = await MCQAttempt.create({
    studentId: studentProfileId,
    mcqSetId,
    answers,
    score,
  });

  await EngagementEvent.create({
    studentId: studentProfileId,
    eventType: "MCQ_ATTEMPT",
    metadata: { mcqSetId, score, totalQuestions: questions.length, correct },
  });

  return {
    attemptId: attempt._id,
    score,
    correct,
    total: questions.length,
    results,
  };
}

// ═══════════════════════════════════════════════════
// PUBLISH / UNPUBLISH
// ═══════════════════════════════════════════════════

async function publishAsset(assetId, actorId, ip) {
  const asset = await ContentAsset.findById(assetId);
  if (!asset) throw new AppError("Content asset not found.", 404);

  if (asset.publishState === "PUBLISHED") {
    return asset;
  }

  const updated = await ContentAsset.findByIdAndUpdate(
    assetId,
    { publishState: "PUBLISHED" },
    { new: true }
  );

  await createAuditLog({
    actorId,
    action: "PUBLISH_CONTENT",
    targetType: "ContentAsset",
    targetId: assetId,
    before: { publishState: asset.publishState },
    after: { publishState: "PUBLISHED" },
    ipAddress: ip,
  });

  return updated;
}

async function unpublishAsset(assetId, actorId, ip) {
  const asset = await ContentAsset.findById(assetId);
  if (!asset) throw new AppError("Content asset not found.", 404);

  const updated = await ContentAsset.findByIdAndUpdate(
    assetId,
    { publishState: "UNPUBLISHED" },
    { new: true }
  );

  await createAuditLog({
    actorId,
    action: "UNPUBLISH_CONTENT",
    targetType: "ContentAsset",
    targetId: assetId,
    before: { publishState: asset.publishState },
    after: { publishState: "UNPUBLISHED" },
    ipAddress: ip,
  });

  return updated;
}

// ═══════════════════════════════════════════════════
// CONTENT LISTING (for teachers)
// ═══════════════════════════════════════════════════

async function listContentByTeacher(teacherProfileId, { topicId, type, publishState } = {}) {
  const query = { teacherId: teacherProfileId };

  if (topicId) query.topicId = topicId;
  if (type) query.type = type;
  if (publishState) query.publishState = publishState;

  return ContentAsset.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: 'topicId',
      select: 'id title',
      populate: { path: 'subjectId', select: 'id name' }
    });
}

async function getTopicContent(topicId) {
  const topic = await Topic.findById(topicId)
    .populate({
      path: 'subjectId',
      select: 'id name',
      populate: [
        { path: 'classId', select: 'name', populate: { path: 'boardId', select: 'name' } },
        { path: 'moduleId', select: 'name', populate: { path: 'programId', select: 'name' } }
      ]
    });

  if (!topic) throw new AppError("Topic not found.", 404);

  const [contentAssets, mcqSets] = await Promise.all([
    ContentAsset.find({ topicId, publishState: "PUBLISHED" })
      .sort({ type: 1, createdAt: -1 })
      .select('id type title textContent duration publishState createdAt'),
    MCQSet.find({ topicId })
      .sort({ createdAt: -1 })
      .select('id questions createdAt')
  ]);

  const videos = contentAssets.filter((a) => a.type === "VIDEO");
  const keyPoints = contentAssets.filter((a) => a.type === "KEY_POINTS");
  const subjectiveQuestions = contentAssets.filter((a) => a.type === "SUBJECTIVE_QUESTION");

  const sanitizedMCQs = mcqSets.map((set) => ({
    id: set._id,
    questionCount: set.questions.length,
    questions: set.questions.map((q) => ({
      question: q.question,
      options: q.options,
    })),
    createdAt: set.createdAt,
  }));

  return {
    topic: {
      id: topic._id,
      title: topic.title,
      subject: topic.subjectId,
    },
    videos,
    keyPoints,
    subjectiveQuestions,
    mcqSets: sanitizedMCQs,
  };
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

async function _verifyTeacherSubjectAccess(teacherProfileId, subjectId) {
  const profile = await TeacherProfile.findById(teacherProfileId)
    .populate('userId', 'role');

  if (!profile) throw new AppError("Teacher profile not found.", 404);

  if (profile.teacherType === "CENTRAL") return true;

  const assignment = await TeacherSubject.findOne({
    teacherId: teacherProfileId,
    subjectId: subjectId._id || subjectId,
  });

  if (!assignment) {
    throw new AppError("You are not assigned to this subject.", 403);
  }

  return true;
}

module.exports = {
  initiateVideoUpload,
  confirmVideoUpload,
  getPlaybackUrl,
  saveKeyPoints,
  saveSubjectiveQuestion,
  createMCQSet,
  updateMCQSet,
  getMCQSetsByTopic,
  submitMCQAttempt,
  publishAsset,
  unpublishAsset,
  listContentByTeacher,
  getTopicContent,
};
