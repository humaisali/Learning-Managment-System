import { useState, useEffect } from "react";
import { FileText, Plus, Edit2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function FeePlanManagePage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", learningType: "CURRICULUM", classId: "", programId: "", amount: "", durationDays: "30", isActive: true });

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get("/enrollment/plans", { params: { includeInactive: "true" } });
        setPlans(res.data.data);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  const refresh = async () => {
    const res = await api.get("/enrollment/plans", { params: { includeInactive: "true" } });
    setPlans(res.data.data);
  };

  const resetForm = () => {
    setForm({ name: "", learningType: "CURRICULUM", classId: "", programId: "", amount: "", durationDays: "30", isActive: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (plan) => {
    setForm({
      name: plan.name,
      learningType: plan.learningType,
      classId: plan.classId || "",
      programId: plan.programId || "",
      amount: String(plan.amount),
      durationDays: String(plan.durationDays),
      isActive: plan.isActive,
    });
    setEditing(plan.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount || !form.durationDays) {
      toast.error("Name, amount, and duration are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        learningType: form.learningType,
        amount: parseFloat(form.amount),
        durationDays: parseInt(form.durationDays, 10),
        isActive: form.isActive,
      };
      if (form.learningType === "CURRICULUM" && form.classId) payload.classId = form.classId;
      if (form.learningType === "SKILL_BASED" && form.programId) payload.programId = form.programId;

      if (editing) {
        await api.put(`/enrollment/plans/${editing}`, payload);
        toast.success("Fee plan updated.");
      } else {
        await api.post("/enrollment/plans", payload);
        toast.success("Fee plan created.");
      }
      resetForm();
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Plans</h1>
          <p className="mt-1 text-sm text-gray-500">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="h-4 w-4" /> New Plan</Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{editing ? "Edit Fee Plan" : "Create Fee Plan"}</CardTitle>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Plan Name" placeholder="e.g., Class 9 Monthly" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Learning Type</label>
                <select value={form.learningType} onChange={(e) => setForm({ ...form, learningType: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="CURRICULUM">Curriculum Based</option>
                  <option value="SKILL_BASED">Skill Based</option>
                </select>
              </div>
              <Input label="Amount (PKR)" type="number" placeholder="3000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input label="Duration (days)" type="number" placeholder="30" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active (visible to students)</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update Plan" : "Create Plan"}</Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <EmptyState icon={FileText} title="No fee plans" description="Create your first fee plan to start accepting enrollments." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {plan.class?.board?.name && `${plan.class.board.name} > `}{plan.class?.name || plan.program?.name || plan.learningType}
                    </p>
                  </div>
                  <button onClick={() => handleEdit(plan)} className="text-gray-400 hover:text-primary-600"><Edit2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(plan.amount)}</p>
                  <p className="text-xs text-gray-500">{plan.durationDays} days access</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant={plan.isActive ? "success" : "default"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                  <Badge variant="default">{plan.learningType.replace("_", " ")}</Badge>
                  {plan._count?.enrollments > 0 && (
                    <span className="text-xs text-gray-400">{plan._count.enrollments} enrolled</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
