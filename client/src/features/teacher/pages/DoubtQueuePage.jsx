import { useState, useEffect, useCallback } from "react";
import {
  HelpCircle, Clock, AlertTriangle, Send, ChevronDown, ChevronUp,
  User, Filter, MessageSquare, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import { DOUBT_STATUS } from "@/lib/constants";
import { useSocket } from "@/hooks/useSocket";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function DoubtQueuePage() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchQueue = useCallback(async () => {
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await api.get("/doubts/teacher/queue", { params });
      setDoubts(res.data.data);
      setTotal(res.data.meta?.total || res.data.data.length);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Real-time: new doubt arrives
  useSocket("doubt:new", (data) => {
    toast(`New doubt from ${data.studentName}: ${data.preview}`, { icon: "❓" });
    fetchQueue();
  });

  const handleRespond = async (doubtId) => {
    if (!responseText.trim()) {
      toast.error("Please write a response.");
      return;
    }

    setResponding(true);
    try {
      await api.post(`/doubts/${doubtId}/respond`, { text: responseText.trim() });
      toast.success("Response sent to student.");
      setResponseText("");
      setExpandedId(null);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send response.");
    } finally {
      setResponding(false);
    }
  };

  const handleStatusChange = async (doubtId, status) => {
    try {
      await api.put(`/doubts/${doubtId}/status`, { status });
      toast.success(`Doubt marked as ${status.toLowerCase()}.`);
      fetchQueue();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doubt Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} doubt{total !== 1 ? "s" : ""} in your queue
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "Actionable", desc: "New + Escalated" },
          { value: "NEW", label: "New" },
          { value: "ANSWERED", label: "Answered" },
          { value: "ESCALATED", label: "Escalated" },
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

      {/* Queue */}
      {doubts.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Queue is clear"
          description="No doubts waiting for your response. Check back later."
        />
      ) : (
        <div className="space-y-3">
          {doubts.map((doubt) => {
            const status = DOUBT_STATUS[doubt.status] || DOUBT_STATUS.NEW;
            const isExpanded = expandedId === doubt.id;

            return (
              <Card key={doubt.id} className={cn(doubt.isAged && "border-l-4 border-l-red-400")}>
                <button
                  onClick={() => { setExpandedId(isExpanded ? null : doubt.id); setResponseText(""); }}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={status.color}>{status.label}</Badge>
                      {doubt.isAged && (
                        <Badge variant="danger" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Aged ({doubt.ageHours}h)
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400">{doubt.subject?.name}</span>
                      <span className="text-xs text-gray-300">&middot;</span>
                      <span className="text-xs text-gray-400">{doubt.topic?.title}</span>
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2">{doubt.text}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doubt.student?.user?.fullName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(doubt.createdAt)}
                      </span>
                      {doubt._count?.responses > 0 && (
                        <span>{doubt._count.responses} response{doubt._count.responses !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* Full doubt text */}
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Full question:</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{doubt.text}</p>
                    </div>

                    {/* Response textarea */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Your response</label>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={4}
                        placeholder="Type your response to the student..."
                        className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(doubt.id)}
                        disabled={responding || !responseText.trim()}
                      >
                        {responding ? "Sending..." : <><Send className="h-3.5 w-3.5" /> Send Response</>}
                      </Button>

                      {doubt.status !== "CLOSED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(doubt.id, "CLOSED")}
                        >
                          Close
                        </Button>
                      )}

                      {doubt.status === "NEW" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(doubt.id, "LIVE_SESSION_RECOMMENDED")}
                        >
                          <Radio className="h-3.5 w-3.5" /> Recommend Live Session
                        </Button>
                      )}
                    </div>
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
