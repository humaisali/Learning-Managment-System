const {
  prisma,
  cleanDatabase,
  createTestUser,
  createTestCatalog,
  createTestFeePlan,
  generateTestToken,
} = require("../setup");

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) { results.push({ name, fn }); }
async function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log("\n═══ Integration Tests ═══\n");
  for (const { name, fn } of results) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${error.message}`);
      failed++;
    }
  }
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// ─── Catalog Integration ────────────────────────

test("should create full catalog hierarchy", async () => {
  await cleanDatabase();
  const { board, class: cls, subject, topic } = await createTestCatalog();

  await assert(board.id, "Board created");
  await assert(cls.boardId === board.id, "Class linked to board");
  await assert(subject.classId === cls.id, "Subject linked to class");
  await assert(topic.subjectId === subject.id, "Topic linked to subject");
});

test("should enforce unique board names", async () => {
  await cleanDatabase();
  await prisma.board.create({ data: { name: "UniqueBoard" } });
  try {
    await prisma.board.create({ data: { name: "UniqueBoard" } });
    throw new Error("Should have thrown");
  } catch (e) {
    await assert(e.code === "P2002", "Should be unique constraint violation");
  }
});

// ─── Enrollment & Payment Integration ───────────

test("should create enrollment and fee plan", async () => {
  await cleanDatabase();
  const student = await createTestUser("STUDENT");
  const { class: cls } = await createTestCatalog();
  const plan = await createTestFeePlan(cls.id);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: profile.id,
      feePlanId: plan.id,
      learningType: "CURRICULUM",
      status: "PENDING",
    },
  });

  await assert(enrollment.status === "PENDING", "Enrollment should be pending");
  await assert(enrollment.feePlanId === plan.id, "Plan should be linked");
});

test("should create payment for enrollment", async () => {
  await cleanDatabase();
  const student = await createTestUser("STUDENT");
  const { class: cls } = await createTestCatalog();
  const plan = await createTestFeePlan(cls.id);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });

  const enrollment = await prisma.enrollment.create({
    data: { studentId: profile.id, feePlanId: plan.id, learningType: "CURRICULUM" },
  });

  const payment = await prisma.payment.create({
    data: {
      enrollmentId: enrollment.id,
      method: "CARD",
      amount: plan.amount,
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
  });

  await assert(payment.status === "CONFIRMED", "Payment should be confirmed");
  await assert(Number(payment.amount) === 3000, "Amount should match plan");
});

// ─── Content & Engagement Integration ───────────

test("should track student topic progress", async () => {
  await cleanDatabase();
  const student = await createTestUser("STUDENT");
  const { topic } = await createTestCatalog();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });

  const progress = await prisma.studentTopicProgress.create({
    data: {
      studentId: profile.id,
      topicId: topic.id,
      status: "IN_PROGRESS",
      watchedSeconds: 300,
      totalSeconds: 600,
    },
  });

  await assert(progress.status === "IN_PROGRESS", "Status should be IN_PROGRESS");
  await assert(progress.watchedSeconds === 300, "Watch time should be 300s");
});

test("should record engagement events", async () => {
  await cleanDatabase();
  const student = await createTestUser("STUDENT");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });

  await prisma.engagementEvent.create({
    data: {
      studentId: profile.id,
      eventType: "WATCH_HEARTBEAT",
      metadata: { playbackPosition: 120 },
    },
  });

  const events = await prisma.engagementEvent.findMany({
    where: { studentId: profile.id },
  });

  await assert(events.length === 1, "Should have one event");
  await assert(events[0].eventType === "WATCH_HEARTBEAT", "Type should match");
});

// ─── Doubt System Integration ───────────────────

test("should create doubt with teacher assignment routing", async () => {
  await cleanDatabase();
  const student = await createTestUser("STUDENT");
  const teacher = await createTestUser("SUBJECT_TEACHER");
  const { subject, topic } = await createTestCatalog();

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: teacher.id },
  });

  // Assign teacher to subject
  await prisma.teacherSubject.create({
    data: { teacherId: teacherProfile.id, subjectId: subject.id },
  });

  // Create doubt
  const doubt = await prisma.doubt.create({
    data: {
      studentId: studentProfile.id,
      topicId: topic.id,
      subjectId: subject.id,
      text: "I don't understand how algebra works. Can you explain the basics?",
      status: "NEW",
    },
  });

  await assert(doubt.status === "NEW", "Doubt should be NEW");
  await assert(doubt.subjectId === subject.id, "Subject should match for routing");

  // Verify routing — teacher can find doubts for their assigned subject
  const assignedDoubts = await prisma.doubt.findMany({
    where: { subjectId: subject.id, status: "NEW" },
  });
  await assert(assignedDoubts.length === 1, "Teacher should see 1 doubt in queue");
});

test("should create doubt response and update status", async () => {
  await cleanDatabase();
  const student = await createTestUser("STUDENT");
  const teacher = await createTestUser("SUBJECT_TEACHER");
  const { subject, topic } = await createTestCatalog();

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: student.id } });
  const teacherProfile = await prisma.teacherProfile.findUnique({ where: { userId: teacher.id } });

  const doubt = await prisma.doubt.create({
    data: {
      studentId: studentProfile.id,
      topicId: topic.id,
      subjectId: subject.id,
      text: "Please explain quadratic equations step by step.",
    },
  });

  // Teacher responds
  await prisma.doubtResponse.create({
    data: {
      doubtId: doubt.id,
      teacherId: teacherProfile.id,
      text: "Great question! Let me break it down for you...",
    },
  });

  await prisma.doubt.update({
    where: { id: doubt.id },
    data: { status: "ANSWERED", firstResponseAt: new Date() },
  });

  const updated = await prisma.doubt.findUnique({
    where: { id: doubt.id },
    include: { responses: true },
  });

  await assert(updated.status === "ANSWERED", "Status should be ANSWERED");
  await assert(updated.responses.length === 1, "Should have one response");
  await assert(updated.firstResponseAt !== null, "First response time recorded");
});

// ─── Referential Integrity Tests ────────────────

test("should prevent orphan content assets", async () => {
  await cleanDatabase();
  try {
    await prisma.contentAsset.create({
      data: {
        topicId: "non-existent-topic-id",
        teacherId: "non-existent-teacher-id",
        type: "VIDEO",
        title: "Orphan Video",
      },
    });
    throw new Error("Should have thrown");
  } catch (e) {
    await assert(
      e.code === "P2003" || e.message.includes("Foreign key"),
      "Should enforce foreign key constraint"
    );
  }
});

test("should cascade delete student data when user deleted", async () => {
  await cleanDatabase();
  const user = await createTestUser("STUDENT");
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

  await assert(profile, "Profile should exist before deletion");

  await prisma.user.delete({ where: { id: user.id } });

  const deletedProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });
  await assert(!deletedProfile, "Profile should be cascade deleted");
});

// ─── Run ────────────────────────────────────────
runTests()
  .then((success) => {
    prisma.$disconnect();
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Test runner failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
