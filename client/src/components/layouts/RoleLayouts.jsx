import DashboardLayout from "./DashboardLayout";
import {
  LayoutDashboard, BookOpen, HelpCircle, Video, BarChart3,
  Users, CreditCard, FileText, Settings, Upload, MessageSquare,
  ClipboardList, Radio, Eye, School, Layers, ShieldCheck,
} from "lucide-react";

// ─── Student Layout ─────────────────────────────
const studentNav = [
  { path: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/student/subjects", label: "My Subjects", icon: BookOpen },
  { path: "/student/doubts", label: "My Doubts", icon: HelpCircle },
  { path: "/student/live-sessions", label: "Live Sessions", icon: Radio },
  { path: "/student/progress", label: "My Progress", icon: BarChart3 },
];

export function StudentLayout() {
  return <DashboardLayout navItems={studentNav} roleLabel="Student" />;
}

// ─── Parent Layout ──────────────────────────────
const parentNav = [
  { path: "/parent", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/parent/progress", label: "Child Progress", icon: BarChart3 },
  { path: "/parent/messages", label: "Messages", icon: MessageSquare },
];

export function ParentLayout() {
  return <DashboardLayout navItems={parentNav} roleLabel="Parent" />;
}

// ─── Teacher Layout (Subject + Central) ─────────
const teacherNav = [
  { path: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/teacher/doubts", label: "Doubt Queue", icon: HelpCircle },
  { path: "/teacher/content", label: "Content Upload", icon: Upload },
  { path: "/teacher/live-sessions", label: "Live Sessions", icon: Radio },
  { path: "/teacher/subjects", label: "My Subjects", icon: BookOpen },
];

export function TeacherLayout() {
  return <DashboardLayout navItems={teacherNav} roleLabel="Teacher" />;
}

// ─── Admin Layout (Head Office + System Admin) ──
const adminNav = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/admin/enrollments", label: "Enrollments", icon: ClipboardList },
  { path: "/admin/payments", label: "Payments", icon: CreditCard },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/catalog", label: "Catalog", icon: Layers },
  { path: "/admin/content", label: "Content Activity", icon: Eye },
  { path: "/admin/fee-plans", label: "Fee Plans", icon: FileText },
  { path: "/admin/complaints", label: "Complaints", icon: MessageSquare },
  { path: "/admin/reports", label: "Reports", icon: BarChart3 },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  return <DashboardLayout navItems={adminNav} roleLabel="Admin" />;
}
