import { useState, useEffect, useCallback } from "react";
import {
  Radio, Play, Square, Plus, Clock, Users, Video,
  Copy, CheckCircle, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function TeacherLiveSessionPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const [form, setForm] = useState({
    subjectId: "",
    topicId: "",
    scheduledAt: "",
  });

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get("/live/my-sessions");
      setSessions(res.data.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Load subjects for the create form
  useEffect(() => {
    async function loadSubjects() {
      try {
        const boardsRes = await api.get("/catalog/boards");
        const allSubjects = [];
        for (const board of boardsRes.data.data) {
          const classesRes = await api.get(`/catalog/boards/${board.id}/classes`);
          for (const cls of classesRes.data.data) {
            const subRes = await api.get(`/catalog/classes/${cls.id}/subjects`);
            subRes.data.data.forEach((s) => {
              allSubjects.push({ ...s, label: `${board.name} > ${cls.name} > ${s.name}` });
            });
          }
        }
        setSubjects(allSubjects);
      } catch {}
    }
    if (showCreate) loadSubjects();
  }, [showCreate]);

  useEffect(() => {
    if (!form.subjectId) { setTopics([]); return; }
    async function loadTopics() {
      try {
        const res = await api.get(`/catalog/subjects/${form.subjectId}/topics`);
        setTopics(res.data.data);
      } catch {}
    }
    loadTopics();
  }, [form.subjectId]);

  const handleCreate = async () => {
    if (!form.topicId) { toast.error("Select a topic."); return; }
    setCreating(true);
    try {
      const payload = { topicId: form.topicId };
      if (form.scheduledAt) payload.scheduledAt = form.scheduledAt;
      await api.post("/live/create", payload);
      toast.success("Live session created! Students have been notified.");
      setShowCreate(false);
      setForm({ subjectId: "", topicId: "", scheduledAt: "" });
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create session.");
    } finally { setCreating(false); }
  };

  const handleStart = async (sessionId) => {
    try {
      await api.post(`/live/${sessionId}/start`);
      toast.success("You are now LIVE! Students can join.");
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to go live.");
    }
  };

  const handleEnd = async (sessionId) => {
    try {
      await api.post(`/live/${sessionId}/end`);
      toast.success("Session ended. Recording will be available shortly.");
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to end session.");
    }
  };

  const copyStreamKey = (key, sessionId) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(sessionId);
    toast.success("Stream key copied!");
    setTimeout(() => setCopiedKey(null), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const liveSessions = sessions.filter((s) => s.status === "LIVE");
  const scheduled = sessions.filter((s) => s.status === "SCHEDULED");
  const past = sessions.filter((s) => s.status === "ENDED" || s.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage micro live sessions</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" /> New Session
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader><CardTitle className="text-base">Create Micro Session</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Subject</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value, topicId: "" })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Topic</label>
                <select
                  value={form.topicId}
                  onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                  disabled={!form.subjectId}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Select topic</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            </div>
            <Input
              label="Schedule for (optional — leave empty to go live immediately after creation)"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating || !form.topicId}>
                {creating ? "Creating..." : "Create Session"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currently Live */}
      {liveSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
            Live Now
          </h2>
          {liveSessions.map((s) => (
            <SessionCard key={s.id} session={s} onEnd={handleEnd} onCopyKey={copyStreamKey} copiedKey={copiedKey} />
          ))}
        </div>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Scheduled</h2>
          {scheduled.map((s) => (
            <SessionCard key={s.id} session={s} onStart={handleStart} onCopyKey={copyStreamKey} copiedKey={copiedKey} />
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Past Sessions</h2>
          {past.slice(0, 10).map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      {sessions.length === 0 && !showCreate && (
        <EmptyState
          icon={Radio}
          title="No live sessions"
          description="Create a micro session when students need live help on a confusing topic."
          action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> Create Session</Button>}
        />
      )}
    </div>
  );
}

function SessionCard({ session, onStart, onEnd, onCopyKey, copiedKey }) {
  const s = session;
  const statusColors = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    LIVE: "bg-red-100 text-red-700",
    ENDED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-gray-100 text-gray-400",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          s.status === "LIVE" ? "bg-red-100" : s.status === "SCHEDULED" ? "bg-blue-100" : "bg-gray-100"
        )}>
          <Radio className={cn(
            "h-5 w-5",
            s.status === "LIVE" ? "text-red-600" : s.status === "SCHEDULED" ? "text-blue-600" : "text-gray-400"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-gray-900 truncate">
              {s.topic?.title}
            </span>
            <Badge className={statusColors[s.status] || statusColors.ENDED}>
              {s.status}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">{s.topic?.subject?.name}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            {s.scheduledAt && <span><Clock className="inline h-3 w-3 mr-0.5" />{formatDateTime(s.scheduledAt)}</span>}
            {s.participantCount > 0 && <span><Users className="inline h-3 w-3 mr-0.5" />{s.participantCount} joined</span>}
            {s.recordingUrl && <span><Video className="inline h-3 w-3 mr-0.5" />Recording available</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {s.status === "SCHEDULED" && s.muxStreamKey && onCopyKey && (
            <Button variant="outline" size="sm" onClick={() => onCopyKey(s.muxStreamKey, s.id)}>
              {copiedKey === s.id ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              Stream Key
            </Button>
          )}
          {s.status === "SCHEDULED" && onStart && (
            <Button size="sm" onClick={() => onStart(s.id)}>
              <Play className="h-3.5 w-3.5" /> Go Live
            </Button>
          )}
          {s.status === "LIVE" && onEnd && (
            <Button size="sm" variant="danger" onClick={() => onEnd(s.id)}>
              <Square className="h-3.5 w-3.5" /> End Session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
