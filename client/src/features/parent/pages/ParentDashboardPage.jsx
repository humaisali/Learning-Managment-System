import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, HelpCircle, Activity, ArrowRight, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, Spinner } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import { getAttentionLevel } from "@/lib/constants";
import useAuthStore from "@/stores/authStore";
import api from "@/lib/api";

function AttentionScoreRing({ score }) {
  const level = getAttentionLevel(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-500">out of 100</span>
        </div>
      </div>
      <span className={cn("mt-2 text-sm font-semibold", level.color)}>{level.label}</span>
    </div>
  );
}

function BreakdownBar({ label, value, weight, raw }) {
  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label} <span className="text-gray-400">({weight}%)</span></span>
        <span className="text-xs font-medium text-gray-700">{raw}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full transition-all duration-500",
            value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-400"
          )}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get("/parent/dashboard");
        setData(res.data.data);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const child = data?.activeChild;
  const score = data?.attentionScore;
  const progress = data?.progress;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        {child && (
          <p className="mt-1 text-sm text-gray-500">
            Monitoring <span className="font-medium text-gray-700">{child.fullName}</span>
            {child.board && <> &middot; {child.board}</>}
            {child.class && <> &middot; {child.class}</>}
          </p>
        )}
      </div>

      {!child ? (
        <Card><CardContent className="py-12 text-center text-sm text-gray-400">No linked student found. Contact support if this is an error.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Attention Score */}
            <Card>
              <CardHeader>
                <CardTitle>Attention Score</CardTitle>
                <CardDescription>Composite engagement indicator — verified activity only</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <AttentionScoreRing score={score?.score || 0} />
              </CardContent>
            </Card>

            {/* Score Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Activity Breakdown</CardTitle>
                  {data?.lastActiveAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Last active: {formatDateTime(data.lastActiveAt)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {score?.breakdown ? (
                  <>
                    <BreakdownBar label="Watch Time" value={score.breakdown.watchTime.value} weight={score.breakdown.watchTime.weight} raw={score.breakdown.watchTime.raw} />
                    <BreakdownBar label="Topic Completion" value={score.breakdown.completion.value} weight={score.breakdown.completion.weight} raw={score.breakdown.completion.raw} />
                    <BreakdownBar label="MCQ Attempts" value={score.breakdown.mcqAttempts.value} weight={score.breakdown.mcqAttempts.weight} raw={score.breakdown.mcqAttempts.raw} />
                    <BreakdownBar label="MCQ Scores" value={score.breakdown.mcqScore.value} weight={score.breakdown.mcqScore.weight} raw={score.breakdown.mcqScore.raw} />
                    <BreakdownBar label="Doubt Participation" value={score.breakdown.doubtParticipation.value} weight={score.breakdown.doubtParticipation.weight} raw={score.breakdown.doubtParticipation.raw} />
                    <BreakdownBar label="Login Consistency" value={score.breakdown.loginConsistency.value} weight={score.breakdown.loginConsistency.weight} raw={score.breakdown.loginConsistency.raw} />
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">No activity data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subject Progress */}
          {data?.subjects?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subject Progress</CardTitle>
                  <Link to={`/parent/progress`}>
                    <Button variant="ghost" size="sm">Full details <ArrowRight className="h-3.5 w-3.5" /></Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.subjects.slice(0, 8).map((subject) => (
                  <div key={subject.id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{subject.name}</span>
                        <span className="text-xs text-gray-500">{subject.completedTopics}/{subject.totalTopics}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={cn("h-full rounded-full transition-all",
                            subject.progressPercent >= 70 ? "bg-green-500" : subject.progressPercent >= 30 ? "bg-primary-500" : subject.progressPercent > 0 ? "bg-yellow-500" : "bg-gray-200"
                          )}
                          style={{ width: `${subject.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-10 text-right">{subject.progressPercent}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat icon={Clock} label="Watch Time" value={`${Math.round((progress?.totalWatchSeconds || 0) / 60)}m`} />
            <MiniStat icon={BookOpen} label="Topics Done" value={`${progress?.completedTopics || 0}/${progress?.totalTopics || 0}`} />
            <MiniStat icon={HelpCircle} label="Doubts (30d)" value={data?.recentDoubts || 0} />
            <MiniStat icon={Activity} label="Overall" value={`${progress?.overallPercent || 0}%`} />
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div><p className="text-xs text-gray-500">{label}</p><p className="text-base font-bold text-gray-900">{value}</p></div>
      </CardContent>
    </Card>
  );
}
