import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, PlayCircle, FileText, HelpCircle,
  CheckCircle, Clock, Circle, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const statusConfig = {
  NOT_STARTED: { icon: Circle, color: "text-gray-300", bg: "bg-gray-100", label: "Not started" },
  IN_PROGRESS: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50", label: "In progress" },
  COMPLETED: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", label: "Completed" },
};

export default function SubjectTopicsPage() {
  const { subjectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get(`/student/subjects/${subjectId}/topics`);
        setData(res.data.data);
      } catch {
        // error handled by empty state
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={FileText}
        title="Subject not found"
        description="This subject may not exist or you may not have access."
      />
    );
  }

  const { subject, topics } = data;
  const completedCount = topics.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/student/subjects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to subjects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {completedCount} of {topics.length} topics completed
              {subject.teacher && <span> &middot; Teacher: {subject.teacher}</span>}
            </p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-gray-100 max-w-md">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-500"
            style={{ width: `${topics.length > 0 ? (completedCount / topics.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Topic List */}
      <div className="space-y-2">
        {topics.map((topic, index) => {
          const config = statusConfig[topic.status];
          const StatusIcon = config.icon;

          return (
            <Link
              key={topic.id}
              to={`/student/topics/${topic.id}`}
            >
              <Card className="transition-all hover:shadow-md hover:border-primary-200">
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Status Icon */}
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    config.bg
                  )}>
                    <StatusIcon className={cn("h-5 w-5", config.color)} />
                  </div>

                  {/* Topic Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {topic.title}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      {topic.hasVideo && (
                        <span className="flex items-center gap-1">
                          <PlayCircle className="h-3 w-3" />
                          Video
                        </span>
                      )}
                      {topic.hasMCQ && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          MCQ
                        </span>
                      )}
                      {topic.doubtCount > 0 && (
                        <span className="flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />
                          {topic.doubtCount} doubt{topic.doubtCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {topic.status === "IN_PROGRESS" && topic.totalSeconds > 0 && (
                    <div className="hidden sm:block w-24">
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-yellow-400"
                          style={{ width: `${Math.min(100, (topic.watchedSeconds / topic.totalSeconds) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400 text-right">
                        {Math.round(topic.watchedSeconds / 60)}m / {Math.round(topic.totalSeconds / 60)}m
                      </p>
                    </div>
                  )}

                  {/* Status Badge */}
                  <Badge variant={
                    topic.status === "COMPLETED" ? "success"
                      : topic.status === "IN_PROGRESS" ? "warning"
                      : "default"
                  }>
                    {config.label}
                  </Badge>

                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {topics.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No topics yet"
          description="Content for this subject hasn't been published yet. Check back soon."
        />
      )}
    </div>
  );
}
