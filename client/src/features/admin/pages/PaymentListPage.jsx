import { useState, useEffect, useCallback } from "react";
import { CreditCard, Search, ChevronLeft, ChevronRight, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn, formatDateTime, formatCurrency } from "@/lib/utils";
import { PAYMENT_STATUS } from "@/lib/constants";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function PaymentListPage() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [verifyingId, setVerifyingId] = useState(null);
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      const res = await api.get("/payment", { params });
      setPayments(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, statusFilter, methodFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerifyBank = async (paymentId) => {
    setVerifyingId(paymentId);
    try {
      await api.put(`/payment/verify-bank/${paymentId}`);
      toast.success("Bank transfer verified. Enrollment activated.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed.");
    } finally { setVerifyingId(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">{total} payment record{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {["", "INITIATED", "PENDING", "CONFIRMED", "FAILED", "REFUNDED"].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", statusFilter === s ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{s || "All"}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "CARD", "JAZZCASH", "EASYPAISA", "BANK_TRANSFER"].map((m) => (
            <button key={m} onClick={() => { setMethodFilter(m); setPage(1); }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", methodFilter === m ? "bg-accent-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{m ? m.replace("_", " ") : "All Methods"}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments found" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const status = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.INITIATED;
                  const isBankPending = p.method === "BANK_TRANSFER" && (p.status === "INITIATED" || p.status === "PENDING");
                  return (
                    <tr key={p.id} className={cn("border-b border-gray-100 hover:bg-gray-50/50 transition-colors", isBankPending && "bg-yellow-50/30")}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.enrollment?.student?.user?.fullName}</p>
                        <p className="text-xs text-gray-400">{p.enrollment?.student?.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.enrollment?.feePlan?.name}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3"><Badge variant="default">{p.method?.replace("_", " ")}</Badge></td>
                      <td className="px-4 py-3"><Badge className={status.color}>{status.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        {isBankPending && (
                          <Button size="sm" variant="success" onClick={() => handleVerifyBank(p.id)} disabled={verifyingId === p.id}>
                            {verifyingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
