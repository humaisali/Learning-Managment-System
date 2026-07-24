import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X, MessageSquare, CreditCard, Radio, Shield } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import useNotificationStore from "@/stores/notificationStore";
import { useSocket } from "@/hooks/useSocket";
import api from "@/lib/api";
import toast from "react-hot-toast";

const typeIcons = {
  DOUBT_RESPONSE: MessageSquare,
  LIVE_SESSION_SCHEDULED: Radio,
  LIVE_SESSION_STARTED: Radio,
  SESSION_RECORDING_AVAILABLE: Radio,
  PAYMENT_SUCCESS: CreditCard,
  PAYMENT_FAILED: CreditCard,
  PARENT_ACTIVATION: Shield,
  ACCOUNT_SUSPENDED: Shield,
  ACCOUNT_REACTIVATED: Shield,
};

const typeColors = {
  DOUBT_RESPONSE: "bg-blue-100 text-blue-600",
  LIVE_SESSION_SCHEDULED: "bg-purple-100 text-purple-600",
  LIVE_SESSION_STARTED: "bg-red-100 text-red-600",
  PAYMENT_SUCCESS: "bg-green-100 text-green-600",
  PAYMENT_FAILED: "bg-red-100 text-red-600",
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const { addNotification } = useNotificationStore();

  // Fetch notifications when panel opens
  useEffect(() => {
    if (!open) return;
    async function fetch() {
      setLoading(true);
      try {
        const res = await api.get("/notifications", { params: { limit: 20 } });
        setNotifications(res.data.data);
        setUnreadCount(parseInt(res.data.message) || 0);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, [open]);

  // Fetch unread count on mount
  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await api.get("/notifications", { params: { limit: 1 } });
        const msg = res.data.message || "";
        const count = parseInt(msg) || 0;
        setUnreadCount(count);
      } catch {}
    }
    fetchCount();
  }, []);

  // Real-time: new notification
  useSocket("notification:new", (data) => {
    setUnreadCount((prev) => prev + 1);
    addNotification(data);
    toast(data.preview || data.subject || "New notification", { icon: "🔔" });
  });

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl animate-slide-down overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                const colorClass = typeColors[notif.type] || "bg-gray-100 text-gray-500";

                return (
                  <button
                    key={notif.id}
                    onClick={() => { if (!notif.isRead) markAsRead(notif.id); }}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                      !notif.isRead && "bg-primary-50/30"
                    )}
                  >
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm leading-snug",
                        notif.isRead ? "text-gray-600" : "text-gray-900 font-medium"
                      )}>
                        {notif.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{notif.body}</p>
                      <p className="mt-1 text-[10px] text-gray-300">
                        {formatDateTime(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
