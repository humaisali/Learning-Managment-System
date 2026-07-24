import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime, formatCurrency } from "@/lib/utils";
import { ENROLLMENT_STATUS } from "@/lib/constants";
import api from "@/lib/api";

export default function EnrollmentListPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/enrollment", { params });
      setEnrollments(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
        <p className="mt-1 text-sm text-gray-500">{total} total enrollment{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "PENDING", "ACTIVE", "SUSPENDED", "EXPIRED"].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", statusFilter === s ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : enrollments.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No enrollments found" description="Adjust your filters or check back later." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Payment</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const status = ENROLLMENT_STATUS[e.status] || ENROLLMENT_STATUS.PENDING;
                  return (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{e.student?.user?.fullName}</p>
                        <p className="text-xs text-gray-400">{e.student?.user?.email || e.student?.user?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{e.feePlan?.name}</p>
                        <p className="text-xs text-gray-400">
                          {e.feePlan?.class?.board?.name && `${e.feePlan.class.board.name} > `}
                          {e.feePlan?.class?.name || e.feePlan?.program?.name}
                        </p>
                      </td>
                      <td className="px-4 py-3"><Badge variant="default">{e.learningType}</Badge></td>
                      <td className="px-4 py-3"><Badge className={status.color}>{status.label}</Badge></td>
                      <td className="px-4 py-3">
                        {e.payment ? (
                          <div>
                            <Badge className={e.payment.status === "CONFIRMED" ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50"}>
                              {e.payment.status}
                            </Badge>
                            <p className="text-xs text-gray-400 mt-0.5">{e.payment.method} &middot; {formatCurrency(e.payment.amount)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No payment</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(e.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
