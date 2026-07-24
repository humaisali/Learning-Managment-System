import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Clock, Users, Play, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function StudentLiveSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchingId, setWatchingId] = useState(null);
  const [watchData, setWatchData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get("/live/upcoming");
        setSessions(res.data.data);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  // Real-time notifications
  useSocket("live:scheduled", (data) => {
    toast(`New live session: ${data.topicTitle} by ${data.teacherName}`, { icon: "📡" });
    // Refresh list
    api.get("/live/upcoming").then((res) => setSessions(res.data.data)).catch(() => {});
  });

  useSocket("live:started", (data) => {
    toast.success(`${data.teacherName} is live now: ${data.topicTitle}. Join now!`);
    api.get("/live/upcoming").then((res) => setSessions(res.data.data)).catch(() => {});
  });

  useSocket("live:ended", (data) => {
    if (watchingId === data.sessionId) {
      toast("The live session has ended.", { icon: "⏹" });
      setWatchingId(null);
      setWatchData(null);
    }
    api.get("/live/upcoming").then((res) => setSessions(res.data.data)).catch(() => {});
  });

  const handleWatch = async (sessionId) => {
    try {
      const res = await api.get(`/live/${sessionId}`);
      const session = res.data.data;

      if (session.status !== "LIVE" || !session.playbackUrl) {
        toast.error("This session is not currently live.");
        return;
      }

      setWatchingId(sessionId);
      setWatchData(session);
    } catch (err) {
      toast.error("Unable to join session.");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  // Watching a live session
  if (watchingId && watchData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <Badge variant="danger">LIVE</Badge>
              <h1 className="text-lg font-bold text-gray-900">{watchData.topic?.title}</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {watchData.teacher} &middot; {watchData.topic?.subject?.name}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setWatchingId(null); setWatchData(null); }}
          >
            Leave Session
          </Button>
        </div>

        {/* Video Player */}
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <video
            src={watchData.playbackUrl}
            className="h-full w-full"
            controls
            autoPlay
            playsInline
          />
        </div>

        {/* Live Chat */}
        <LiveChat sessionId={watchingId} />
      </div>
    );
  }

  const liveSessions = sessions.filter((s) => s.status === "LIVE");
  const upcoming = sessions.filter((s) => s.status === "SCHEDULED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Sessions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Join live micro sessions from your teachers
        </p>
      </div>

      {/* Live Now */}
      {liveSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Live Now
          </h2>
          {liveSessions.map((s) => (
            <Card key={s.id} className="border-red-200 bg-red-50/30">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <Radio className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{s.topic?.title}</h3>
                  <p className="text-xs text-gray-500">
                    {s.teacher?.user?.fullName} &middot; {s.topic?.subject?.name}
                  </p>
                </div>
                <Button size="sm" onClick={() => handleWatch(s.id)}>
                  <Play className="h-3.5 w-3.5" /> Join Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Upcoming</h2>
          {upcoming.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">{s.topic?.title}</h3>
                  <p className="text-xs text-gray-500">
                    {s.teacher?.user?.fullName} &middot; {s.topic?.subject?.name}
                  </p>
                  {s.scheduledAt && (
                    <p className="mt-0.5 text-xs text-blue-600 font-medium">
                      <Clock className="inline h-3 w-3 mr-0.5" />
                      {formatDateTime(s.scheduledAt)}
                    </p>
                  )}
                </div>
                <Badge variant="info">Scheduled</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <EmptyState
          icon={Radio}
          title="No upcoming sessions"
          description="When your teachers schedule live sessions, they'll appear here. You'll also get a notification."
        />
      )}
    </div>
  );
}

// ─── Live Chat Component ────────────────────────
function LiveChat({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const { emitSocket } = require("@/hooks/useSocket");
  const { getSocket } = require("@/lib/socket");

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit("join:live-session", sessionId);
    }
    return () => {
      if (socket) socket.emit("leave:live-session", sessionId);
    };
  }, [sessionId]);

  useSocket("live:chat:message", (msg) => {
    setMessages((prev) => [...prev, msg].slice(-200));
  });

  const sendMessage = () => {
    if (!input.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit("live:chat:message", { sessionId, text: input.trim() });
    }
    setInput("");
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Messages */}
        <div className="h-60 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">
              Chat is live. Type a message below.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-gray-700">{msg.userId?.slice(0, 8)}: </span>
              <span className="text-gray-600">{msg.text}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t border-gray-100 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Button size="sm" onClick={sendMessage} disabled={!input.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
