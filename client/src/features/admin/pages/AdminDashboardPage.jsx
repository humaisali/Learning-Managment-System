import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, CreditCard, ClipboardList, AlertTriangle, TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight, Upload, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, Spinner } from "@/components/ui/Elements";
import { cn, formatCurrency } from "@/lib/utils";
import api from "@/lib/api";

function MetricCard({ icon: Icon, label, value, trend, trendLabel, color, href }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-5">
        <div className="flex items-start justify-between">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}><Icon className="h-5 w-5 text-white" /></div>
          {href && <Link to={href}><Button variant="ghost" size="icon-sm"><ArrowRight className="h-4 w-4" /></Button></Link>}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
        {trendLabel && (
          <div className="mt-2 flex items-center gap-1">
            {trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5 text-green-600" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />}
            <span className={cn("text-xs font-medium", trend === "up" ? "text-green-600" : "text-red-600")}>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get("/admin/dashboard");
        setMetrics(res.data.data);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;

  const m = metrics || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Platform overview and operational metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Total Students" value={m.totalStudents || 0} color="bg-primary-600" href="/admin/users?role=STUDENT" trend={m.newStudentsThisMonth > 0 ? "up" : null} trendLabel={m.newStudentsThisMonth > 0 ? `+${m.newStudentsThisMonth} this month` : null} />
        <MetricCard icon={ClipboardList} label="Active Enrollments" value={m.activeEnrollments || 0} color="bg-green-600" href="/admin/enrollments" />
        <MetricCard icon={CreditCard} label="Revenue (This Month)" value={formatCurrency(m.revenue?.thisMonth || 0)} color="bg-accent-600" href="/admin/payments" trend={m.revenue?.trendPercent > 0 ? "up" : m.revenue?.trendPercent < 0 ? "down" : null} trendLabel={m.revenue?.trendPercent ? `${m.revenue.trendPercent > 0 ? "+" : ""}${m.revenue.trendPercent}% vs last month` : null} />
        <MetricCard icon={AlertTriangle} label="Open Complaints" value={m.openComplaints || 0} color="bg-yellow-500" href="/admin/complaints" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pending Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <ActionItem label="Bank Transfers Awaiting Verification" count={m.pendingBankTransfers || 0} href="/admin/payments?status=PENDING&method=BANK_TRANSFER" />
            <ActionItem label="Aged Doubts (No Response 24h+)" count={m.unresolvedDoubts24h || 0} href="/admin/complaints" />
            <ActionItem label="Open Complaints" count={m.openComplaints || 0} href="/admin/complaints" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Platform Stats</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <StatRow label="Total Teachers" value={m.totalTeachers || 0} />
            <StatRow label="Content Uploads (This Month)" value={m.contentUploadsThisMonth || 0} />
            <StatRow label="Revenue Last Month" value={formatCurrency(m.revenue?.lastMonth || 0)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActionItem({ label, count, href }) {
  return (
    <Link to={href} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
      <span className="text-sm text-gray-700">{label}</span>
      <Badge variant={count > 0 ? "warning" : "default"}>{count}</Badge>
    </Link>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
