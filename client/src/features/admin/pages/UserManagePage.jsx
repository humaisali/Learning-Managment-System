import { useState, useEffect, useCallback } from "react";
import { Users, Search, ChevronLeft, ChevronRight, ShieldOff, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState, Avatar } from "@/components/ui/Elements";
import { cn, formatDateTime } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function UserManagePage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/users", { params });
      setUsers(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSuspend = async (userId) => {
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;
    setActionLoading(userId);
    try {
      await api.put(`/users/${userId}/suspend`, { reason });
      toast.success("User suspended.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to suspend.");
    } finally { setActionLoading(null); }
  };

  const handleReactivate = async (userId) => {
    setActionLoading(userId);
    try {
      await api.put(`/users/${userId}/reactivate`);
      toast.success("User reactivated.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reactivate.");
    } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">{total} user{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, or phone..." className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "STUDENT", "PARENT", "SUBJECT_TEACHER", "CENTRAL_TEACHER", "HEAD_OFFICE"].map((r) => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", roleFilter === r ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {r ? ROLE_LABELS[r] || r : "All Roles"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["", "active", "suspended"].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", statusFilter === s ? "bg-accent-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {s || "All Status"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Last Login</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={cn("border-b border-gray-100 hover:bg-gray-50/50 transition-colors", u.isSuspended && "bg-red-50/30")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{u.fullName}</p>
                          <p className="text-xs text-gray-400">{u.email || u.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="primary">{ROLE_LABELS[u.role] || u.role}</Badge></td>
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <div>
                          <Badge variant="danger">Suspended</Badge>
                          {u.suspendReason && <p className="text-[10px] text-red-500 mt-0.5">{u.suspendReason}</p>}
                        </div>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <Button size="sm" variant="outline" onClick={() => handleReactivate(u.id)} disabled={actionLoading === u.id}>
                          {actionLoading === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Reactivate
                        </Button>
                      ) : u.role !== "SYSTEM_ADMIN" ? (
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleSuspend(u.id)} disabled={actionLoading === u.id}>
                          {actionLoading === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />} Suspend
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
