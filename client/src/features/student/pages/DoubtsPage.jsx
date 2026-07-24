import { useState, useEffect } from "react";
import { HelpCircle, MessageSquare, Clock, ChevronDown, ChevronUp, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import { DOUBT_STATUS } from "@/lib/constants";
import api from "@/lib/api";

export default function StudentDoubtsPage() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const params = {};
        if (filter) params.status = filter;
        const res = await api.get("/doubts/my", { params });
        setDoubts(res.data.data);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, [filter]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Doubts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your submitted questions and teacher responses
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "All" },
          { value: "NEW", label: "Pending" },
          { value: "ANSWERED", label: "Answered" },
          { value: "CLOSED", label: "Closed" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setLoading(true); }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.value
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Doubt List */}
      {doubts.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No doubts found"
          description={filter ? "No doubts match this filter." : "You haven't submitted any doubts yet. Ask questions from within any topic page."}
        />
      ) : (
        <div className="space-y-3">
          {doubts.map((doubt) => {
            const status = DOUBT_STATUS[doubt.status] || DOUBT_STATUS.NEW;
            const isExpanded = expandedId === doubt.id;

            return (
              <Card key={doubt.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : doubt.id)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={status.color}>{status.label}</Badge>
                      <span className="text-xs text-gray-400">{doubt.subject?.name}</span>
                      <span className="text-xs text-gray-300">&middot;</span>
                      <span className="text-xs text-gray-400">{doubt.topic?.title}</span>
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2">{doubt.text}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(doubt.createdAt)}
                      </span>
                      {doubt._count?.responses > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {doubt._count.responses} response{doubt._count.responses !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                  )}
                </button>

                {/* Expanded: show responses */}
                {isExpanded && doubt.responses?.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-3">
                    {doubt.responses.map((resp) => (
                      <div key={resp.id} className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100">
                          <User className="h-4 w-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-800">
                              {resp.teacher?.user?.fullName || "Teacher"}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formatDateTime(resp.createdAt)}
                            </span>
                          </div>
                          {resp.text && (
                            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                              {resp.text}
                            </p>
                          )}
                          {resp.clipUrl && (
                            <a
                              href={resp.clipUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                            >
                              Watch video response
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && (!doubt.responses || doubt.responses.length === 0) && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    <p className="text-xs text-gray-400 text-center">
                      No responses yet. Your teacher will reply soon.
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
