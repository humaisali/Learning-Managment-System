const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

/**
 * Test database client — uses the test database URL.
 * Ensure DATABASE_URL in .env.test points to a separate test DB.
 */
const prisma = new PrismaClient({
  log: ["error"],
});

/**
 * Clean all tables between test runs.
 * Deletes in the correct order to respect foreign key constraints.
 */
async function cleanDatabase() {
  const tableNames = [
    "ParentMessage",
    "DoubtResponse",
    "Doubt",
    "MCQAttempt",
    "MCQSet",
    "EngagementEvent",
    "StudentTopicProgress",
    "LiveSession",
    "ContentAsset",
    "Complaint",
    "Notification",
    "AuditLog",
    "Payment",
    "Enrollment",
    "FeePlan",
    "TeacherSubject",
    "ParentLink",
    "RefreshToken",
    "OTPCode",
    "TeacherProfile",
    "StudentProfile",
    "Topic",
    "Subject",
    "Module",
    "Program",
    "Class",
    "Board",
    "User",
  ];

  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    } catch {
      // Table might not exist yet in test DB
    }
  }
}

/**
 * Create a test user with a specific role.
 */
async function createTestUser(role = "STUDENT", overrides = {}) {
  const timestamp = Date.now();
  const passwordHash = await bcrypt.hash("testpass123", 4); // Low rounds for speed

  const userData = {
    email: `test_${role.toLowerCase()}_${timestamp}@test.local`,
    fullName: `Test ${role}`,
    role,
    passwordHash,
    ...overrides,
  };

  const user = await prisma.user.create({ data: userData });

  // Create role-specific profile
  if (role === "STUDENT") {
    await prisma.studentProfile.create({
      data: { userId: user.id },
    });
  } else if (role === "CENTRAL_TEACHER" || role === "SUBJECT_TEACHER") {
    await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        teacherType: role === "CENTRAL_TEACHER" ? "CENTRAL" : "SUBJECT",
      },
    });
  }

  return user;
}

/**
 * Create a minimal catalog structure for testing.
 */
async function createTestCatalog() {
  const board = await prisma.board.create({
    data: { name: `Test Board ${Date.now()}` },
  });

  const cls = await prisma.class.create({
    data: { name: "Test Class 9", boardId: board.id },
  });

  const subject = await prisma.subject.create({
    data: { name: "Test Mathematics", classId: cls.id },
  });

  const topic = await prisma.topic.create({
    data: { title: "Test Topic: Algebra Basics", subjectId: subject.id },
  });

  return { board, class: cls, subject, topic };
}

/**
 * Create a test fee plan.
 */
async function createTestFeePlan(classId) {
  return prisma.feePlan.create({
    data: {
      name: `Test Plan ${Date.now()}`,
      learningType: "CURRICULUM",
      classId,
      amount: 3000,
      currency: "PKR",
      durationDays: 30,
    },
  });
}

/**
 * Generate a mock JWT token for testing.
 */
function generateTestToken(userId, role) {
  const jwt = require("jsonwebtoken");
  const config = require("../src/config");

  return jwt.sign(
    { userId, role },
    config.jwt.accessSecret || "test-secret-key-at-least-32-chars",
    { expiresIn: "1h" }
  );
}

module.exports = {
  prisma,
  cleanDatabase,
  createTestUser,
  createTestCatalog,
  createTestFeePlan,
  generateTestToken,
};
