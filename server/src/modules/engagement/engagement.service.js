const { AppError } = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const EngagementEvent = require("../../models/EngagementEvent");
const StudentTopicProgress = require("../../models/StudentTopicProgress");
const StudentProfile = require("../../models/StudentProfile");
const Module = require("../../models/Module");
const Subject = require("../../models/Subject");
const Topic = require("../../models/Topic");
const MCQSet = require("../../models/MCQSet");
const MCQAttempt = require("../../models/MCQAttempt");
const Doubt = require("../../models/Doubt");
const ContentAsset = require("../../models/ContentAsset");

// ═══════════════════════════════════════════════════
// VIDEO HEARTBEAT
// ═══════════════════════════════════════════════════

// Completion threshold: student must watch at least 85% of the video
const COMPLETION_THRESHOLD = 0.85;
// Heartbeat interval expected from the client (seconds)
const HEARTBEAT_INTERVAL = 30;

/**
 * Process a video watch heartbeat from the student's player.
 */
async function processHeartbeat(studentProfileId, data) {
  const { assetId, topicId, playbackPosition, sessionToken } = data;

  // Record the raw engagement event
  await EngagementEvent.create({
    studentId: studentProfileId,
    contentAssetId: assetId || null,
    eventType: "WATCH_HEARTBEAT",
    metadata: {
      topicId,
      playbackPosition,
      sessionToken,
      timestamp: new Date().toISOString(),
    },
  });

  // Get or create the topic progress record
  let progress = await StudentTopicProgress.findOne({
    studentId: studentProfileId,
    topicId,
  });

  // If no progress record exists, create one
  if (!progress) {
    // Get total video duration for this topic
    const totalSeconds = await _getTopicTotalDuration(topicId);

    progress = await StudentTopicProgress.create({
      studentId: studentProfileId,
      topicId,
      status: "IN_PROGRESS",
      watchedSeconds: HEARTBEAT_INTERVAL,
      totalSeconds,
    });
  } else {
    // Increment watched time by the heartbeat interval
    const newWatched = progress.watchedSeconds + HEARTBEAT_INTERVAL;

    const updateData = {
      watchedSeconds: newWatched,
    };

    // Check if not already completed and now meets threshold
    if (progress.status !== "COMPLETED") {
      updateData.status = "IN_PROGRESS";

      if (progress.totalSeconds > 0) {
        const watchRatio = newWatched / progress.totalSeconds;
        if (watchRatio >= COMPLETION_THRESHOLD) {
          updateData.status = "COMPLETED";
          updateData.completedAt = new Date();

          // Record completion event
          await EngagementEvent.create({
            studentId: studentProfileId,
            contentAssetId: assetId || null,
            eventType: "VIDEO_COMPLETE",
            metadata: { topicId, watchedSeconds: newWatched },
          });

          logger.info("Topic marked complete", { studentProfileId, topicId, watchRatio });
        }
      }
    }

    progress = await StudentTopicProgress.findByIdAndUpdate(
      progress._id,
      updateData,
      { new: true }
    );
  }

  return {
    received: true,
    watchedSeconds: progress.watchedSeconds,
    status: progress.status,
  };
}

/**
 * Record a login/session event for login consistency tracking.
 */
async function recordSessionLogin(studentProfileId) {
  await EngagementEvent.create({
    studentId: studentProfileId,
    eventType: "SESSION_LOGIN",
    metadata: { timestamp: new Date().toISOString() },
  });
}

// ═══════════════════════════════════════════════════
// STUDENT PROGRESS
// ═══════════════════════════════════════════════════

/**
 * Get a student's progress across all their enrolled topics.
 */
async function getStudentProgress(studentProfileId) {
  const profile = await StudentProfile.findById(studentProfileId).select('classId programId');

  if (!profile) throw new AppError("Student profile not found.", 404);

  // Get all subjects the student has access to
  const subjectFilter = { isActive: true };
  if (profile.classId) subjectFilter.classId = profile.classId;
  if (profile.programId) {
    const modules = await Module.find({ programId: profile.programId }).select('_id');
    subjectFilter.moduleId = { $in: modules.map((m) => m._id) };
  }

  const subjects = await Subject.find(subjectFilter).sort({ sortOrder: 1 });

  // Get all topics for these subjects
  const allTopics = await Topic.find({
    subjectId: { $in: subjects.map(s => s._id) },
    isActive: true
  }).sort({ sortOrder: 1 });

  // Group topics by subject
  const topicsBySubject = {};
  allTopics.forEach(t => {
    if (!topicsBySubject[t.subjectId]) topicsBySubject[t.subjectId] = [];
    topicsBySubject[t.subjectId].push(t);
  });

  // Get all topic progress for this student
  const progressRecords = await StudentTopicProgress.find({ studentId: studentProfileId });

  const progressMap = {};
  progressRecords.forEach((p) => {
    progressMap[p.topicId.toString()] = p;
  });

  // Build the response with per-subject breakdown
  const result = subjects.map((subject) => {
    const sTopics = topicsBySubject[subject._id] || [];
    const topicsWithProgress = sTopics.map((topic) => {
      const prog = progressMap[topic._id.toString()];
      return {
        id: topic._id,
        title: topic.title,
        status: prog?.status || "NOT_STARTED",
        watchedSeconds: prog?.watchedSeconds || 0,
        totalSeconds: prog?.totalSeconds || 0,
        completedAt: prog?.completedAt || null,
      };
    });

    const completedCount = topicsWithProgress.filter((t) => t.status === "COMPLETED").length;
    const inProgressCount = topicsWithProgress.filter((t) => t.status === "IN_PROGRESS").length;
    const totalWatch = topicsWithProgress.reduce((sum, t) => sum + t.watchedSeconds, 0);

    return {
      id: subject._id,
      name: subject.name,
      totalTopics: sTopics.length,
      completedTopics: completedCount,
      inProgressTopics: inProgressCount,
      totalWatchSeconds: totalWatch,
      progressPercent: sTopics.length > 0
        ? Math.round((completedCount / sTopics.length) * 100)
        : 0,
      topics: topicsWithProgress,
    };
  });

  // Summary totals
  const summary = {
    totalSubjects: result.length,
    totalTopics: result.reduce((s, r) => s + r.totalTopics, 0),
    completedTopics: result.reduce((s, r) => s + r.completedTopics, 0),
    totalWatchSeconds: result.reduce((s, r) => s + r.totalWatchSeconds, 0),
    overallPercent: 0,
  };

  if (summary.totalTopics > 0) {
    summary.overallPercent = Math.round(
      (summary.completedTopics / summary.totalTopics) * 100
    );
  }

  return { summary, subjects: result };
}

/**
 * Get a student's progress for a single topic.
 */
async function getTopicProgress(studentProfileId, topicId) {
  const progress = await StudentTopicProgress.findOne({
    studentId: studentProfileId,
    topicId,
  });

  // Get MCQ attempt history for this topic
  const mcqSets = await MCQSet.find({ topicId }).select('_id');
  const setIds = mcqSets.map(s => s._id);

  const mcqAttempts = setIds.length > 0
    ? await MCQAttempt.find({
        studentId: studentProfileId,
        mcqSetId: { $in: setIds },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id score createdAt')
    : [];

  return {
    status: progress?.status || "NOT_STARTED",
    watchedSeconds: progress?.watchedSeconds || 0,
    totalSeconds: progress?.totalSeconds || 0,
    completedAt: progress?.completedAt || null,
    mcqAttempts: mcqAttempts.map(a => ({ id: a._id, score: a.score, createdAt: a.createdAt })),
    latestMCQScore: mcqAttempts.length > 0 ? mcqAttempts[0].score : null,
  };
}

// ═══════════════════════════════════════════════════
// ATTENTION SCORE
// ═══════════════════════════════════════════════════

/**
 * Compute the attention score for a student.
 */
async function computeAttentionScore(studentProfileId) {
  const [
    progressData,
    mcqData,
    doubtCount,
    loginData,
  ] = await Promise.all([
    _getWatchAndCompletionMetrics(studentProfileId),
    _getMCQMetrics(studentProfileId),
    Doubt.countDocuments({ studentId: studentProfileId }),
    _getLoginConsistency(studentProfileId),
  ]);

  // Signal 1: Watch Time (35%)
  const watchTimePct = progressData.totalAvailable > 0
    ? Math.min(100, (progressData.totalWatched / progressData.totalAvailable) * 100)
    : 0;

  // Signal 2: Topic Completion (25%)
  const completionPct = progressData.totalTopics > 0
    ? (progressData.completedTopics / progressData.totalTopics) * 100
    : 0;

  // Signal 3: MCQ Attempt Rate (12%)
  const mcqAttemptPct = mcqData.topicsWithMCQs > 0
    ? Math.min(100, (mcqData.topicsAttempted / mcqData.topicsWithMCQs) * 100)
    : 0;

  // Signal 4: MCQ Average Score (8%)
  const mcqScorePct = mcqData.averageScore;

  // Signal 5: Doubt Participation (12%)
  // Baseline: 1 doubt per 5 topics
  const expectedDoubts = Math.max(1, Math.floor(progressData.totalTopics / 5));
  const doubtPct = Math.min(100, (doubtCount / expectedDoubts) * 100);

  // Signal 6: Login Consistency (8%)
  // Expected: 20 active days per 30-day window
  const loginPct = Math.min(100, (loginData.activeDays / 20) * 100);

  // Weighted sum
  const score = Math.round(
    (watchTimePct * 0.35) +
    (completionPct * 0.25) +
    (mcqAttemptPct * 0.12) +
    (mcqScorePct * 0.08) +
    (doubtPct * 0.12) +
    (loginPct * 0.08)
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      watchTime: { value: Math.round(watchTimePct), weight: 35, raw: `${Math.round(progressData.totalWatched / 60)}m / ${Math.round(progressData.totalAvailable / 60)}m` },
      completion: { value: Math.round(completionPct), weight: 25, raw: `${progressData.completedTopics} / ${progressData.totalTopics} topics` },
      mcqAttempts: { value: Math.round(mcqAttemptPct), weight: 12, raw: `${mcqData.topicsAttempted} / ${mcqData.topicsWithMCQs} topics` },
      mcqScore: { value: Math.round(mcqScorePct), weight: 8, raw: `${Math.round(mcqScorePct)}% avg` },
      doubtParticipation: { value: Math.round(doubtPct), weight: 12, raw: `${doubtCount} doubts` },
      loginConsistency: { value: Math.round(loginPct), weight: 8, raw: `${loginData.activeDays} / 20 active days` },
    },
  };
}

// ═══════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════

async function _getTopicTotalDuration(topicId) {
  const assets = await ContentAsset.find({
    topicId, type: "VIDEO", publishState: "PUBLISHED"
  }).select('duration');
  return assets.reduce((sum, a) => sum + (a.duration || 0), 0);
}

async function _getWatchAndCompletionMetrics(studentProfileId) {
  const allProgress = await StudentTopicProgress.find({ studentId: studentProfileId });

  const profile = await StudentProfile.findById(studentProfileId).select('classId programId');

  let totalTopicCount = 0;
  let totalAvailable = 0;

  if (profile && profile.classId) {
    const subjects = await Subject.find({ classId: profile.classId, isActive: true }).select('_id');
    const subjectIds = subjects.map(s => s._id);

    totalTopicCount = await Topic.countDocuments({
      isActive: true,
      subjectId: { $in: subjectIds }
    });
    
    // Using aggregation for total duration
    const assetsAggr = await ContentAsset.aggregate([
      {
        $lookup: {
          from: "topics",
          localField: "topicId",
          foreignField: "_id",
          as: "topic"
        }
      },
      { $unwind: "$topic" },
      {
        $match: {
          type: "VIDEO",
          publishState: "PUBLISHED",
          "topic.isActive": true,
          "topic.subjectId": { $in: subjectIds }
        }
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: "$duration" }
        }
      }
    ]);
    
    totalAvailable = assetsAggr.length > 0 ? assetsAggr[0].totalDuration : 0;
  }

  return {
    totalTopics: totalTopicCount,
    completedTopics: allProgress.filter((p) => p.status === "COMPLETED").length,
    totalWatched: allProgress.reduce((s, p) => s + p.watchedSeconds, 0),
    totalAvailable,
  };
}

async function _getMCQMetrics(studentProfileId) {
  const profile = await StudentProfile.findById(studentProfileId).select('classId');

  let topicsWithMCQs = 0;
  if (profile && profile.classId) {
    const subjects = await Subject.find({ classId: profile.classId, isActive: true }).select('_id');
    const subjectIds = subjects.map(s => s._id);
    
    const topics = await Topic.find({ subjectId: { $in: subjectIds }, isActive: true }).select('_id');
    const topicIds = topics.map(t => t._id);

    const mcqTopics = await MCQSet.distinct("topicId", {
      topicId: { $in: topicIds }
    });
    topicsWithMCQs = mcqTopics.length;
  }

  const attempts = await MCQAttempt.find({ studentId: studentProfileId }).select('mcqSetId score');

  const attemptedSetIds = [...new Set(attempts.map((a) => a.mcqSetId.toString()))];
  let topicsAttempted = 0;
  if (attemptedSetIds.length > 0) {
    const topicIds = await MCQSet.distinct("topicId", { _id: { $in: attemptedSetIds } });
    topicsAttempted = topicIds.length;
  }

  const averageScore = attempts.length > 0
    ? attempts.reduce((s, a) => s + a.score, 0) / attempts.length
    : 0;

  return { topicsWithMCQs, topicsAttempted, averageScore };
}

async function _getLoginConsistency(studentProfileId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const events = await EngagementEvent.find({
    studentId: studentProfileId,
    eventType: { $in: ["WATCH_HEARTBEAT", "SESSION_LOGIN"] },
    createdAt: { $gte: thirtyDaysAgo },
  }).select('createdAt');

  const dayMap = {};
  events.forEach((e) => {
    const day = e.createdAt.toISOString().split("T")[0];
    dayMap[day] = (dayMap[day] || 0) + 1;
  });

  const activeDays = Object.values(dayMap).filter((count) => count >= 10).length;

  return { activeDays };
}

module.exports = {
  processHeartbeat,
  recordSessionLogin,
  getStudentProgress,
  getTopicProgress,
  computeAttentionScore,
};
