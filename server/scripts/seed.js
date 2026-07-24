const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

// Load env vars
dotenv.config({ path: __dirname + "/../.env" });

const Board = require("../src/models/Board");
const Class = require("../src/models/Class");
const Subject = require("../src/models/Subject");
const Topic = require("../src/models/Topic");
const Program = require("../src/models/Program");
const Module = require("../src/models/Module");
const FeePlan = require("../src/models/FeePlan");
const User = require("../src/models/User");
const TeacherProfile = require("../src/models/TeacherProfile");
const TeacherSubject = require("../src/models/TeacherSubject");
const StudentProfile = require("../src/models/StudentProfile");
const ParentLink = require("../src/models/ParentLink");

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Seeding database...\n");

  // Clear existing data (optional, be careful in prod!)
  // await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({})));

  // ─── Create Boards ────────────────────────────
  const federal = await Board.create({
    name: "Federal Board", description: "Federal Board of Intermediate and Secondary Education", sortOrder: 1,
  });
  const punjab = await Board.create({
    name: "Punjab Board", description: "Board of Intermediate and Secondary Education Punjab", sortOrder: 2,
  });
  const cambridge = await Board.create({
    name: "Cambridge (O/A Level)", description: "Cambridge International Examinations", sortOrder: 3,
  });
  console.log("✓ Boards created");

  // ─── Create Classes ───────────────────────────
  const classes = {};
  for (const board of [federal, punjab, cambridge]) {
    for (const num of [9, 10, 11, 12]) {
      const label = board._id.toString() === cambridge._id.toString() ? `O Level Year ${num - 8}` : `Class ${num}`;
      const cls = await Class.create({
        name: label, boardId: board._id, sortOrder: num,
      });
      classes[`${board.name}_${num}`] = cls;
    }
  }
  console.log("✓ Classes created");

  // ─── Create Subjects (Federal Board Class 9) ──
  const fedClass9 = classes["Federal Board_9"];
  const subjectNames = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Urdu", "Computer Science", "Islamiat"];
  const subjects = {};
  for (let i = 0; i < subjectNames.length; i++) {
    const subject = await Subject.create({
      name: subjectNames[i], classId: fedClass9._id, sortOrder: i + 1,
    });
    subjects[subjectNames[i]] = subject;
  }
  console.log("✓ Subjects created (Federal Board Class 9)");

  // ─── Create Topics (Mathematics) ──────────────
  const mathTopics = [
    "Number Systems", "Sets and Functions", "Algebraic Expressions",
    "Linear Equations", "Quadratic Equations", "Ratio and Proportion",
    "Geometry Basics", "Triangles", "Circles", "Statistics",
  ];
  const topics = {};
  for (let i = 0; i < mathTopics.length; i++) {
    const topic = await Topic.create({
      title: mathTopics[i], subjectId: subjects["Mathematics"]._id, sortOrder: i + 1,
    });
    topics[mathTopics[i]] = topic;
  }
  console.log("✓ Topics created (Mathematics)");

  // ─── Create Skill-Based Program ───────────────
  const webDev = await Program.create({
    name: "Web Development Bootcamp", description: "Full-stack web development from scratch",
  });
  const mod1 = await Module.create({
    name: "Frontend Fundamentals", programId: webDev._id, sortOrder: 1,
  });
  await Subject.create({
    name: "HTML & CSS", moduleId: mod1._id, sortOrder: 1,
  });
  await Subject.create({
    name: "JavaScript Essentials", moduleId: mod1._id, sortOrder: 2,
  });
  console.log("✓ Skill-based program created");

  // ─── Create Fee Plans ─────────────────────────
  await FeePlan.create({
    name: "Federal Board Class 9 - Monthly",
    learningType: "CURRICULUM",
    classId: fedClass9._id,
    amount: 3000,
    currency: "PKR",
    durationDays: 30,
  });
  await FeePlan.create({
    name: "Federal Board Class 9 - Quarterly",
    learningType: "CURRICULUM",
    classId: fedClass9._id,
    amount: 7500,
    currency: "PKR",
    durationDays: 90,
  });
  await FeePlan.create({
    name: "Web Development Bootcamp - Full Access",
    learningType: "SKILL_BASED",
    programId: webDev._id,
    amount: 15000,
    currency: "PKR",
    durationDays: 180,
  });
  console.log("✓ Fee plans created");

  // ─── Create Users ─────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  // System Admin
  await User.create({
    email: "admin@lms.local",
    fullName: "System Administrator",
    role: "SYSTEM_ADMIN",
    passwordHash,
  });

  // Head Office
  await User.create({
    email: "headoffice@lms.local",
    fullName: "Head Office Manager",
    role: "HEAD_OFFICE",
    passwordHash,
  });

  // Central Teacher
  const centralTeacher = await User.create({
    email: "teacher.central@lms.local",
    fullName: "Ahmed Khan",
    role: "CENTRAL_TEACHER",
    passwordHash,
  });
  await TeacherProfile.create({
    userId: centralTeacher._id, teacherType: "CENTRAL",
  });

  // Subject Teacher (Mathematics)
  const mathTeacher = await User.create({
    email: "teacher.math@lms.local",
    fullName: "Sara Ahmad",
    role: "SUBJECT_TEACHER",
    passwordHash,
  });
  const mathTeacherProfile = await TeacherProfile.create({
    userId: mathTeacher._id, teacherType: "SUBJECT",
  });
  await TeacherSubject.create({
    teacherId: mathTeacherProfile._id, subjectId: subjects["Mathematics"]._id,
  });

  // Student
  const student = await User.create({
    email: "student@lms.local",
    phone: "+923001234567",
    fullName: "Ali Hassan",
    role: "STUDENT",
    passwordHash,
  });
  await StudentProfile.create({
    userId: student._id,
    boardId: federal._id,
    classId: fedClass9._id,
  });

  // Parent
  const parent = await User.create({
    email: "parent@lms.local",
    phone: "+923009876543",
    fullName: "Hassan Ali (Father)",
    role: "PARENT",
    passwordHash,
  });
  await ParentLink.create({
    parentId: parent._id, studentId: student._id,
  });

  console.log("✓ Users created");
  console.log("\n─── Seed Login Credentials ───");
  console.log("Admin:    admin@lms.local / password123");
  console.log("Office:   headoffice@lms.local / password123");
  console.log("Teacher:  teacher.math@lms.local / password123");
  console.log("Student:  student@lms.local / password123");
  console.log("Parent:   parent@lms.local / password123");
  console.log("──────────────────────────────\n");
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
