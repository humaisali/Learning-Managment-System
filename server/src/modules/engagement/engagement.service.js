const prisma = require("../../config/database");
const { AppError } = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

// ═══════════════════════════════════════════════════
// VIDEO HEARTBEAT
// ═══════════════════════════════════════════════════

// Completion threshold: student must watch at least 85% of the video
const COMPLETION_THRESHOLD = 0.85;
// Heartbeat interval expected from the client (seconds)
const HEARTBEAT_INTERVAL = 30;

/**
 * Process a video watch heartbeat from the student's player.
 * Called every 30 seconds during active playback.
 * 
 * Updates:
 * 1. Creates an EngagementEvent record
 * 2. Updates StudentTopicProgress (watched seconds)
 * 3. Checks for topic completion
 */
async function processHeartbeat(studentProfileId, data) {
  const { assetId, topicId, playbackPosition, sessionToken } = data;

  // Record the raw engagement event
  await prisma.engagementEvent.create({
    data: {
      studentId: studentProfileId,
      contentAssetId: assetId || null,
      eventType: "WATCH_HEARTBEAT",
      metadata: {
        topicId,
        playbackPosition,
        sessionToken,
        timestamp: new Date().toISOString(),
      },
    },
  });

  // Get or create the topic progress record
  let progress = await prisma.studentTopicProgress.findUnique({
    where: {
      studentId_topicId: {
        studentId: studentProfileId,
        topicId,
      },
    },
  });

  // If no progress record exists, create one
  if (!progress) {
    // Get total video duration for this topic
    const totalSeconds = await _getTopicTotalDuration(topicId);

    progress = await prisma.studentTopicProgress.create({
      data: {
        studentId: studentProfileId,
        topicId,
        status: "IN_PROGRESS",
        watchedSeconds: HEARTBEAT_INTERVAL,
        totalSeconds,
      },
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
          await prisma.engagementEvent.create({
            data: {
              studentId: studentProfileId,
              contentAssetId: assetId || null,
              eventType: "VIDEO_COMPLETE",
              metadata: { topicId, watchedSeconds: newWatched },
            },
          });

          logger.info("Topic marked complete", { studentProfileId, topicId, watchRatio });
        }
      }
    }

    progress = await prisma.studentTopicProgress.update({
      where: { id: progress.id },
      data: updateData,
    });
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
  await prisma.engagementEvent.create({
    data: {
      studentId: studentProfileId,
      eventType: "SESSION_LOGIN",
      metadata: { timestamp: new Date().toISOString() },
    },
  });
}

// ═══════════════════════════════════════════════════
// STUDENT PROGRESS
// ═══════════════════════════════════════════════════

/**
 * Get a student's progress across all their enrolled topics.
 */
async function getStudentProgress(studentProfileId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { classId: true, programId: true },
  });

  if (!profile) throw new AppError("Student profile not found.", 404);

  // Get all subjects the student has access to
  const subjectFilter = {};
  if (profile.classId) subjectFilter.classId = profile.classId;
  if (profile.programId) {
    const modules = await prisma.module.findMany({
      where: { programId: profile.programId },
      select: { id: true },
    });
    subjectFilter.moduleId = { in: modules.map((m) => m.id) };
  }

  const subjects = await prisma.subject.findMany({
    where: { ...subjectFilter, isActive: true },
    include: {
      topics: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Get all topic progress for this student
  const progressRecords = await prisma.studentTopicProgress.findMany({
    where: { studentId: studentProfileId },
  });

  const progressMap = {};
  progressRecords.forEach((p) => {
    progressMap[p.topicId] = p;
  });

  // Build the response with per-subject breakdown
  const result = subjects.map((subject) => {
    const topicsWithProgress = subject.topics.map((topic) => {
      const prog = progressMap[topic.id];
      return {
        id: topic.id,
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
      id: subject.id,
      name: subject.name,
      totalTopics: subject.topics.length,
      completedTopics: completedCount,
      inProgressTopics: inProgressCount,
      totalWatchSeconds: totalWatch,
      progressPercent: subject.topics.length > 0
        ? Math.round((completedCount / subject.topics.length) * 100)
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
  const progress = await prisma.studentTopicProgress.findUnique({
    where: {
      studentId_topicId: { studentId: studentProfileId, topicId },
    },
  });

  // Get MCQ attempt history for this topic
  const mcqSets = await prisma.mCQSet.findMany({
    where: { topicId },
    select: { id: true },
  });

  const mcqAttempts = mcqSets.length > 0
    ? await prisma.mCQAttempt.findMany({
        where: {
          studentId: studentProfileId,
          mcqSetId: { in: mcqSets.map((s) => s.id) },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, score: true, createdAt: true },
      })
    : [];

  return {
    status: progress?.status || "NOT_STARTED",
    watchedSeconds: progress?.watchedSeconds || 0,
    totalSeconds: progress?.totalSeconds || 0,
    completedAt: progress?.completedAt || null,
    mcqAttempts,
    latestMCQScore: mcqAttempts.length > 0 ? mcqAttempts[0].score : null,
  };
}

// ═══════════════════════════════════════════════════
// ATTENTION SCORE
// ═══════════════════════════════════════════════════

/**
 * Compute the attention score for a student.
 * 
 * Formula (from architecture document):
 *   Score = (watchTime × 0.35) + (completion × 0.25) +
 *           (mcqAttempt × 0.12) + (mcqScore × 0.08) +
 *           (doubtPct × 0.12) + (loginPct × 0.08)
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
    prisma.doubt.count({ where: { studentId: studentProfileId } }),
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
  const assets = await prisma.contentAsset.findMany({
    where: { topicId, type: "VIDEO", publishState: "PUBLISHED" },
    select: { duration: true },
  });
  return assets.reduce((sum, a) => sum + (a.duration || 0), 0);
}

async function _getWatchAndCompletionMetrics(studentProfileId) {
  const allProgress = await prisma.studentTopicProgress.findMany({
    where: { studentId: studentProfileId },
  });

  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { classId: true, programId: true },
  });

  // Count total accessible topics
  let totalTopicCount = 0;
  if (profile.classId) {
    totalTopicCount = await prisma.topic.count({
      where: {
        isActive: true,
        subject: { classId: profile.classId, isActive: true },
      },
    });
  }

  // Total available video duration
  let totalAvailable = 0;
  if (profile.classId) {
    const assets = await prisma.contentAsset.aggregate({
      where: {
        type: "VIDEO",
        publishState: "PUBLISHED",
        topic: { isActive: true, subject: { classId: profile.classId } },
      },
      _sum: { duration: true },
    });
    totalAvailable = assets._sum.duration || 0;
  }

  return {
    totalTopics: totalTopicCount,
    completedTopics: allProgress.filter((p) => p.status === "COMPLETED").length,
    totalWatched: allProgress.reduce((s, p) => s + p.watchedSeconds, 0),
    totalAvailable,
  };
}

async function _getMCQMetrics(studentProfileId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { classId: true },
  });

  // Topics that have MCQ sets
  let topicsWithMCQs = 0;
  if (profile.classId) {
    const mcqTopics = await prisma.mCQSet.findMany({
      where: {
        topic: { isActive: true, subject: { classId: profile.classId } },
      },
      select: { topicId: true },
      distinct: ["topicId"],
    });
    topicsWithMCQs = mcqTopics.length;
  }

  // Topics where this student has attempted MCQs
  const attempts = await prisma.mCQAttempt.findMany({
    where: { studentId: studentProfileId },
    select: { mcqSetId: true, score: true },
  });

  const attemptedSetIds = [...new Set(attempts.map((a) => a.mcqSetId))];
  let topicsAttempted = 0;
  if (attemptedSetIds.length > 0) {
    const sets = await prisma.mCQSet.findMany({
      where: { id: { in: attemptedSetIds } },
      select: { topicId: true },
      distinct: ["topicId"],
    });
    topicsAttempted = sets.length;
  }

  // Average score (latest attempt per set)
  const averageScore = attempts.length > 0
    ? attempts.reduce((s, a) => s + a.score, 0) / attempts.length
    : 0;

  return { topicsWithMCQs, topicsAttempted, averageScore };
}

async function _getLoginConsistency(studentProfileId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Count distinct days with watch heartbeats (minimum 5 minutes = 10 heartbeats)
  const events = await prisma.engagementEvent.findMany({
    where: {
      studentId: studentProfileId,
      eventType: { in: ["WATCH_HEARTBEAT", "SESSION_LOGIN"] },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true },
  });

  // Group by date and count heartbeats per day
  const dayMap = {};
  events.forEach((e) => {
    const day = e.createdAt.toISOString().split("T")[0];
    dayMap[day] = (dayMap[day] || 0) + 1;
  });

  // An "active day" requires at least 10 heartbeats (5 min of watch time)
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
