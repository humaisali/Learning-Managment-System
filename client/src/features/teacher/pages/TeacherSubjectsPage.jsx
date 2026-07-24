import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Layers, GraduationCap, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner, EmptyState } from "@/components/ui/Elements";
import api from "@/lib/api";

export default function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await api.get("/teacher/subjects");
        setSubjects(res.data.data);
      } catch {
        // silently fail
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
          title="No subjects assigned"
          description="You have not been assigned any subjects yet. Contact the head office if you believe this is an error."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subjects</h1>
        <p className="mt-1 text-sm text-gray-500">
          You are managing {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Link key={subject.id} to={`/teacher/subjects/${subject.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md border border-gray-200">
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                      <BookOpen className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{subject.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <GraduationCap className="h-3 w-3" />
                        {subject.className || subject.moduleName || "Unknown Class"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 mt-1" />
                </div>

                <div className="mt-5 flex items-center gap-4 border-t pt-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-gray-400" />
                    <span><strong className="text-gray-900">{subject.topicCount}</strong> topics</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
