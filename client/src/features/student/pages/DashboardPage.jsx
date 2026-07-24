import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, HelpCircle, TrendingUp, ArrowRight, ChevronRight, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/authStore";
import api from "@/lib/api";

function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-5">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="mt-0.5 text-xs text-gray-400">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get("/student/dashboard");
        setDashboard(res.data.data);
      } catch { /* empty state fallback */ }
      finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const stats = dashboard?.stats || { totalSubjects: 0, watchTimeMinutes: 0, completedTopics: 0, doubtsAsked: 0 };

  function fmtTime(m) {
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.fullName?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-gray-500">Here's an overview of your learning progress</p>
        {dashboard?.profile?.board && (
          <div className="mt-2 flex gap-2">
            <Badge variant="default">{dashboard.profile.board.name}</Badge>
            {dashboard.profile.class && <Badge variant="primary">{dashboard.profile.class.name}</Badge>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Enrolled Subjects" value={stats.totalSubjects} color="bg-primary-600" subtext="Active enrollment" />
        <StatCard icon={Clock} label="Watch Time" value={fmtTime(stats.watchTimeMinutes)} color="bg-accent-600" subtext="Total verified time" />
        <StatCard icon={TrendingUp} label="Topics Completed" value={stats.completedTopics} color="bg-green-600" subtext="Across all subjects" />
        <StatCard icon={HelpCircle} label="Doubts Asked" value={stats.doubtsAsked} color="bg-purple-600" subtext="Questions submitted" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Subjects</CardTitle>
              <Link to="/student/subjects"><Button variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboard?.subjects?.length > 0 ? (
              <div className="space-y-2">
                {dashboard.subjects.slice(0, 6).map((s) => (
                  <Link key={s.id} to={`/student/subjects/${s.id}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100"><BookOpen className="h-4 w-4 text-primary-600" /></div>
                      <div><p className="text-sm font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-400">{s.topicCount} topics</p></div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={BookOpen} title="No subjects yet" description="Once you're enrolled, your subjects will appear here." action={<Link to="/student/enroll"><Button size="sm">Browse Plans</Button></Link>} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {dashboard?.recentActivity?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentActivity.slice(0, 8).map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", a.type === "VIDEO_COMPLETE" ? "bg-green-100" : a.type === "MCQ_ATTEMPT" ? "bg-purple-100" : "bg-blue-100")}>
                      <PlayCircle className={cn("h-3 w-3", a.type === "VIDEO_COMPLETE" ? "text-green-600" : a.type === "MCQ_ATTEMPT" ? "text-purple-600" : "text-blue-600")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">{a.type === "VIDEO_COMPLETE" ? "Completed" : a.type === "MCQ_ATTEMPT" ? "MCQ attempt" : "Watched"}{a.title ? `: ${a.title}` : ""}</p>
                      <p className="text-[10px] text-gray-400">{new Date(a.timestamp).toLocaleString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No activity yet. Start watching lectures to track your progress.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
