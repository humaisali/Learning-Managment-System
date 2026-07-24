import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ParentMessagesPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get("/parent/messages/threads");
        setThreads(res.data.data);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  useEffect(() => {
    if (!activeThread) return;
    async function fetchMessages() {
      try {
        const res = await api.get(`/parent/messages/${activeThread.teacherId}/${activeThread.subjectId}`);
        setMessages(res.data.data);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch {}
    }
    fetchMessages();
  }, [activeThread]);

  const handleSend = async () => {
    if (!input.trim() || !activeThread) return;
    setSending(true);
    try {
      await api.post("/parent/messages/send", {
        teacherId: activeThread.teacherId,
        subjectId: activeThread.subjectId,
        message: input.trim(),
      });
      setInput("");
      // Refresh messages
      const res = await api.get(`/parent/messages/${activeThread.teacherId}/${activeThread.subjectId}`);
      setMessages(res.data.data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error("Failed to send message.");
    } finally { setSending(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;

  // Message view
  if (activeThread) {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveThread(null)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to threads
        </button>
        <Card className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="text-base">{activeThread.teacherName}</CardTitle>
            <p className="text-xs text-gray-500">{activeThread.subjectName} &middot; {activeThread.studentName}</p>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3 pb-0">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No messages yet. Start the conversation.</p>
            ) : messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.isFromParent ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-xl px-4 py-2.5", msg.isFromParent ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-800")}>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className={cn("mt-1 text-[10px]", msg.isFromParent ? "text-primary-200" : "text-gray-400")}>{formatDateTime(msg.createdAt)}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="shrink-0 border-t border-gray-100 p-4">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type a message..." className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              <Button size="sm" onClick={handleSend} disabled={sending || !input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Thread list
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">Communicate with your child's teachers</p>
      </div>
      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No message threads" description="Message threads with your child's teachers will appear here." />
      ) : (
        <div className="space-y-2">
          {threads.map((t, i) => (
            <button key={i} onClick={() => setActiveThread(t)} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{t.teacherName}</span>
                  <Badge variant="default">{t.subjectName}</Badge>
                </div>
                {t.lastMessage && <p className="mt-0.5 text-xs text-gray-500 truncate">{t.lastMessage}</p>}
              </div>
              {t.lastMessageAt && <span className="text-[10px] text-gray-400 shrink-0">{formatDateTime(t.lastMessageAt)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
