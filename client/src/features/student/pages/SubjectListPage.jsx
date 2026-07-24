import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, User, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

export default function SubjectListPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await api.get("/student/subjects");
        setSubjects(res.data.data);
      } catch {
        // silently fail — empty state will show
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
        <EmptyState
          icon={BookOpen}
          title="No subjects available"
          description="Once your enrollment is active, your subjects will appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
        <p className="mt-1 text-sm text-gray-500">
          {subjects.length} subject{subjects.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Link key={subject.id} to={`/student/subjects/${subject.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="py-5">
                {/* Subject Name */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                      <BookOpen className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{subject.name}</h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {subject.totalTopics} topic{subject.totalTopics !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 mt-1" />
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium text-gray-700">{subject.progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        subject.progressPercent >= 70 ? "bg-green-500"
                          : subject.progressPercent >= 30 ? "bg-primary-500"
                          : subject.progressPercent > 0 ? "bg-yellow-500"
                          : "bg-gray-200"
                      )}
                      style={{ width: `${subject.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {subject.watchTimeMinutes}m watched
                  </div>
                  <div>
                    {subject.completedTopics}/{subject.totalTopics} done
                  </div>
                </div>

                {/* Teacher */}
                {subject.hasTeacher && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    {subject.teacherName}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
