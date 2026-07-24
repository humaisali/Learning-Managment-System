import { useState, useEffect } from "react";
import { BarChart3, BookOpen, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Spinner, EmptyState } from "@/components/ui/Elements";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get("/engagement/progress");
        setData(res.data.data);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data || data.subjects.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <EmptyState
          icon={BarChart3}
          title="No progress data yet"
          description="Start watching lectures and attempting MCQs to track your progress."
        />
      </div>
    );
  }

  const { summary, subjects } = data;

  function formatMinutes(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your learning across all subjects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={BookOpen}
          label="Subjects"
          value={summary.totalSubjects}
          color="bg-primary-600"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Topics Completed"
          value={`${summary.completedTopics}/${summary.totalTopics}`}
          color="bg-green-600"
        />
        <SummaryCard
          icon={Clock}
          label="Watch Time"
          value={formatMinutes(summary.totalWatchSeconds)}
          color="bg-accent-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Overall Progress"
          value={`${summary.overallPercent}%`}
          color="bg-purple-600"
        />
      </div>

      {/* Per Subject Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Subject Breakdown</h2>
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{subject.name}</h3>
                <span className="text-sm font-bold text-gray-700">{subject.progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    subject.progressPercent >= 70 ? "bg-green-500"
                      : subject.progressPercent >= 30 ? "bg-primary-500"
                      : subject.progressPercent > 0 ? "bg-yellow-500"
                      : "bg-gray-200"
                  )}
                  style={{ width: `${subject.progressPercent}%` }}
                />
              </div>

              <div className="mt-3 flex items-center gap-6 text-xs text-gray-500">
                <span>{subject.completedTopics} of {subject.totalTopics} topics done</span>
                <span>{subject.inProgressTopics} in progress</span>
                <span>{formatMinutes(subject.totalWatchSeconds)} watched</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
