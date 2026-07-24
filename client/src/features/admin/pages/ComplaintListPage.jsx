import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open", color: "text-blue-600 bg-blue-50" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-yellow-600 bg-yellow-50" },
  { value: "RESOLVED", label: "Resolved", color: "text-green-600 bg-green-50" },
  { value: "CLOSED", label: "Closed", color: "text-gray-600 bg-gray-50" },
];

export default function ComplaintListPage() {
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [resolution, setResolution] = useState("");
  const [updating, setUpdating] = useState(false);
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/admin/complaints", { params });
      setComplaints(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateStatus = async (complaintId, newStatus) => {
    setUpdating(true);
    try {
      const data = { status: newStatus };
      if (newStatus === "RESOLVED" && resolution.trim()) data.resolution = resolution.trim();
      await api.put(`/admin/complaints/${complaintId}`, data);
      toast.success(`Complaint marked as ${newStatus.toLowerCase().replace("_", " ")}.`);
      setResolution("");
      setExpandedId(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to update complaint.");
    } finally { setUpdating(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Complaints & Refunds</h1>
        <p className="mt-1 text-sm text-gray-500">{total} complaint{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", ...STATUS_OPTIONS.map((s) => s.value)].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", statusFilter === s ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{s || "All"}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : complaints.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No complaints found" />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => {
            const status = STATUS_OPTIONS.find((s) => s.value === c.status) || STATUS_OPTIONS[0];
            const isExpanded = expandedId === c.id;

            return (
              <Card key={c.id}>
                <button onClick={() => { setExpandedId(isExpanded ? null : c.id); setResolution(""); }} className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={status.color}>{status.label}</Badge>
                      <Badge variant="default">{c.type}</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{c.subject}</p>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{c.description}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                      <span>{c.user?.fullName || "Unknown"}</span>
                      <span>{c.user?.email}</span>
                      <span>{formatDateTime(c.createdAt)}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Full description:</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.description}</p>
                    </div>

                    {c.resolution && (
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs font-medium text-green-700 mb-1">Resolution:</p>
                        <p className="text-sm text-green-800">{c.resolution}</p>
                      </div>
                    )}

                    {c.status !== "CLOSED" && c.status !== "RESOLVED" && (
                      <>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-600">Resolution notes (optional)</label>
                          <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="Add resolution notes..." className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.status === "OPEN" && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(c.id, "IN_PROGRESS")} disabled={updating}>Mark In Progress</Button>
                          )}
                          <Button size="sm" variant="success" onClick={() => handleUpdateStatus(c.id, "RESOLVED")} disabled={updating}>
                            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Resolve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(c.id, "CLOSED")} disabled={updating}>Close</Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
