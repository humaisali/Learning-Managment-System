import { createBrowserRouter } from "react-router-dom";
import { RequireAuth, RequireRole, RedirectIfAuth } from "@/components/common/RouteGuards";
import { StudentLayout, ParentLayout, TeacherLayout, AdminLayout } from "@/components/layouts/RoleLayouts";
import ComingSoonPage from "@/components/common/ComingSoonPage";

// Auth Pages
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";

// Dashboard Pages
import StudentDashboardPage from "@/features/student/pages/DashboardPage";
import ParentDashboardPage from "@/features/parent/pages/ParentDashboardPage";
import TeacherDashboardPage from "@/features/teacher/pages/TeacherDashboardPage";
import AdminDashboardPage from "@/features/admin/pages/AdminDashboardPage";

// Phase 2: Student Learning Pages
import SubjectListPage from "@/features/student/pages/SubjectListPage";
import SubjectTopicsPage from "@/features/student/pages/SubjectTopicsPage";
import TopicViewPage from "@/features/student/pages/TopicViewPage";
import ProgressPage from "@/features/student/pages/ProgressPage";

// Phase 2: Teacher Content Pages
import ContentUploadPage from "@/features/teacher/pages/ContentUploadPage";
import TeacherSubjectsPage from "@/features/teacher/pages/TeacherSubjectsPage";

// Phase 3: Support Workflow Pages
import StudentDoubtsPage from "@/features/student/pages/DoubtsPage";
import StudentLiveSessionsPage from "@/features/student/pages/LiveSessionsPage";
import DoubtQueuePage from "@/features/teacher/pages/DoubtQueuePage";
import TeacherLiveSessionPage from "@/features/teacher/pages/LiveSessionPage";

// Phase 4: Visibility & Operations Pages
import ParentMessagesPage from "@/features/parent/pages/MessagesPage";
import EnrollmentListPage from "@/features/admin/pages/EnrollmentListPage";
import PaymentListPage from "@/features/admin/pages/PaymentListPage";
import UserManagePage from "@/features/admin/pages/UserManagePage";
import CatalogManagePage from "@/features/admin/pages/CatalogManagePage";
import ComplaintListPage from "@/features/admin/pages/ComplaintListPage";
import FeePlanManagePage from "@/features/admin/pages/FeePlanManagePage";
import ReportsPage from "@/features/admin/pages/ReportsPage";

const router = createBrowserRouter([
  // ─── Public / Auth Routes ───────────────────
  {
    path: "/login",
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    ),
  },
  {
    path: "/register",
    element: (
      <RedirectIfAuth>
        <RegisterPage />
      </RedirectIfAuth>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <RedirectIfAuth>
        <ForgotPasswordPage />
      </RedirectIfAuth>
    ),
  },

  // ─── Student Routes ─────────────────────────
  {
    path: "/student",
    element: (
      <RequireAuth>
        <RequireRole roles={["STUDENT"]}>
          <StudentLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <StudentDashboardPage /> },
      { path: "subjects", element: <SubjectListPage /> },
      { path: "subjects/:subjectId", element: <SubjectTopicsPage /> },
      { path: "topics/:topicId", element: <TopicViewPage /> },
      { path: "doubts", element: <StudentDoubtsPage /> },
      { path: "live-sessions", element: <StudentLiveSessionsPage /> },
      { path: "progress", element: <ProgressPage /> },
      { path: "enroll", element: <ComingSoonPage title="Choose a Plan" /> },
      { path: "profile", element: <ComingSoonPage title="My Profile" /> },
    ],
  },

  // ─── Parent Routes ──────────────────────────
  {
    path: "/parent",
    element: (
      <RequireAuth>
        <RequireRole roles={["PARENT"]}>
          <ParentLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <ParentDashboardPage /> },
      { path: "progress", element: <ComingSoonPage title="Detailed Progress" description="Detailed per-topic breakdown coming in a future update." /> },
      { path: "messages", element: <ParentMessagesPage /> },
      { path: "profile", element: <ComingSoonPage title="My Profile" /> },
    ],
  },

  // ─── Teacher Routes ─────────────────────────
  {
    path: "/teacher",
    element: (
      <RequireAuth>
        <RequireRole roles={["CENTRAL_TEACHER", "SUBJECT_TEACHER"]}>
          <TeacherLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TeacherDashboardPage /> },
      { path: "doubts", element: <DoubtQueuePage /> },
      { path: "content", element: <ContentUploadPage /> },
      { path: "live-sessions", element: <TeacherLiveSessionPage /> },
      { path: "subjects", element: <ComingSoonPage title="My Subjects" /> },
      { path: "profile", element: <ComingSoonPage title="My Profile" /> },
    ],
  },

  // ─── Admin Routes ───────────────────────────
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <RequireRole roles={["HEAD_OFFICE", "SYSTEM_ADMIN"]}>
          <AdminLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "enrollments", element: <EnrollmentListPage /> },
      { path: "payments", element: <PaymentListPage /> },
      { path: "users", element: <UserManagePage /> },
      { path: "catalog", element: <CatalogManagePage /> },
      { path: "content", element: <ComingSoonPage title="Content Activity" description="Content upload monitoring coming in a future update." /> },
      { path: "fee-plans", element: <FeePlanManagePage /> },
      { path: "complaints", element: <ComplaintListPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <ComingSoonPage title="Settings" /> },
      { path: "profile", element: <ComingSoonPage title="My Profile" /> },
    ],
  },

  // ─── Root Redirect ──────────────────────────
  {
    path: "/",
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    ),
  },

  // ─── 404 Catch-All ──────────────────────────
  {
    path: "*",
    element: (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="mt-2 text-lg text-gray-500">Page not found</p>
        <a href="/" className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700">
          Go back home
        </a>
      </div>
    ),
  },
], {
  future: {
    v7_startTransition: true,
  },
});

export default router;
