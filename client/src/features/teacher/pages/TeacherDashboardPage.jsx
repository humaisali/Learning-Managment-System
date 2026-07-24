import { HelpCircle, Radio, BookOpen, Upload, ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, EmptyState } from "@/components/ui/Elements";
import useAuthStore from "@/stores/authStore";

function StatCard({ icon: Icon, label, value, color, action }) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
          {action}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboardPage() {
  const { user } = useAuthStore();
  const isSubjectTeacher = user?.role === "SUBJECT_TEACHER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isSubjectTeacher
            ? "Manage doubts, respond to students, and run live sessions"
            : "Upload and manage lecture content for your subjects"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isSubjectTeacher && (
          <StatCard
            icon={HelpCircle}
            label="Pending Doubts"
            value="0"
            color="bg-yellow-500"
            action={
              <Link to="/teacher/doubts">
                <Button variant="ghost" size="icon-sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            }
          />
        )}
        <StatCard
          icon={Upload}
          label="Content Uploaded"
          value="0"
          color="bg-primary-600"
        />
        {isSubjectTeacher && (
          <StatCard
            icon={Radio}
            label="Sessions This Month"
            value="0"
            color="bg-purple-600"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Doubt Queue Preview */}
        {isSubjectTeacher && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Doubts</CardTitle>
                <Link to="/teacher/doubts">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={HelpCircle}
                title="No pending doubts"
                description="When students submit questions on your subjects, they'll appear here."
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/teacher/content" className="block">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                <Upload className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload New Content</p>
                  <p className="text-xs text-gray-500">Add lectures, key points, or MCQs</p>
                </div>
              </div>
            </Link>
            {isSubjectTeacher && (
              <Link to="/teacher/live-sessions" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                  <Radio className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Start Live Session</p>
                    <p className="text-xs text-gray-500">Run a micro session for a confusing topic</p>
                  </div>
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
