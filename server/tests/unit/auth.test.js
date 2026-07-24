const {
  prisma,
  cleanDatabase,
  createTestUser,
  generateTestToken,
} = require("../setup");

// Simple test runner — no external framework dependency
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  results.push({ name, fn });
}

async function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log("\n═══ Auth Module Tests ═══\n");

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

// ─── Tests ──────────────────────────────────────

test("should create a student user with profile", async () => {
  await cleanDatabase();
  const user = await createTestUser("STUDENT", { email: "student@test.local" });

  await assert(user.id, "User should have an ID");
  await assert(user.role === "STUDENT", "Role should be STUDENT");
  await assert(user.email === "student@test.local", "Email should match");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });
  await assert(profile, "Student profile should exist");
});

test("should create a teacher user with profile", async () => {
  await cleanDatabase();
  const user = await createTestUser("SUBJECT_TEACHER");

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
  });
  await assert(profile, "Teacher profile should exist");
  await assert(profile.teacherType === "SUBJECT", "Teacher type should be SUBJECT");
});

test("should prevent duplicate email registration", async () => {
  await cleanDatabase();
  await createTestUser("STUDENT", { email: "dupe@test.local" });

  try {
    await createTestUser("STUDENT", { email: "dupe@test.local" });
    throw new Error("Should have thrown");
  } catch (error) {
    await assert(
      error.message.includes("Unique constraint") || error.code === "P2002",
      "Should throw unique constraint error"
    );
  }
});

test("should generate a valid JWT token", async () => {
  const jwt = require("jsonwebtoken");
  const token = generateTestToken("test-user-id", "STUDENT");

  await assert(token, "Token should be generated");

  const decoded = jwt.decode(token);
  await assert(decoded.userId === "test-user-id", "Token should contain userId");
  await assert(decoded.role === "STUDENT", "Token should contain role");
});

test("should hash passwords correctly", async () => {
  const bcrypt = require("bcryptjs");
  const password = "TestPassword123!";
  const hash = await bcrypt.hash(password, 4);

  await assert(hash !== password, "Hash should differ from password");
  await assert(await bcrypt.compare(password, hash), "Should verify correct password");
  await assert(!(await bcrypt.compare("wrong", hash)), "Should reject wrong password");
});

test("should enforce RBAC role checks", async () => {
  const { authorize } = require("../../src/middleware/rbac");

  const middleware = authorize("HEAD_OFFICE", "SYSTEM_ADMIN");

  // Mock request with wrong role
  const mockReq = { user: { role: "STUDENT" } };
  let errorCaught = null;

  const mockNext = (err) => { errorCaught = err; };
  middleware(mockReq, {}, mockNext);

  await assert(errorCaught, "Should call next with error");
  await assert(errorCaught.statusCode === 403, "Should be 403 Forbidden");
});

test("should validate Zod schemas correctly", async () => {
  const { registerSchema } = require("../../src/modules/auth/auth.schema");

  // Valid data
  const valid = registerSchema.safeParse({
    fullName: "Test User",
    email: "test@example.com",
    password: "password123",
  });
  await assert(valid.success, "Valid data should pass");

  // Missing required fields
  const invalid = registerSchema.safeParse({
    fullName: "T",
    email: "",
    phone: "",
  });
  await assert(!invalid.success, "Invalid data should fail");
});

test("should create audit log entries", async () => {
  await cleanDatabase();
  const user = await createTestUser("SYSTEM_ADMIN");
  const { createAuditLog } = require("../../src/middleware/audit");

  await createAuditLog({
    actorId: user.id,
    action: "TEST_ACTION",
    targetType: "TestEntity",
    targetId: "test-target-123",
    before: { status: "old" },
    after: { status: "new" },
    ipAddress: "127.0.0.1",
  });

  const logs = await prisma.auditLog.findMany({
    where: { actorId: user.id, action: "TEST_ACTION" },
  });

  await assert(logs.length === 1, "Should create one audit log");
  await assert(logs[0].targetType === "TestEntity", "Target type should match");
  await assert(logs[0].ipAddress === "127.0.0.1", "IP should be recorded");
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
