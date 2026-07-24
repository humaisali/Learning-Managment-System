import { useState } from "react";
import { BarChart3, Download, FileSpreadsheet, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import api from "@/lib/api";
import toast from "react-hot-toast";

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ReportsPage() {
  const [loading, setLoading] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleExport = async (type) => {
    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get(`/reports/export/${type}`, {
        params,
        responseType: "text",
      });

      const filename = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(res.data, filename);
      toast.success(`${type} report downloaded.`);
    } catch (err) {
      toast.error(`Failed to export ${type} report.`);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const reports = [
    {
      key: "enrollments",
      title: "Enrollments Report",
      description: "Export all enrollment records with student details, plan info, payment status, and activation dates.",
      icon: FileSpreadsheet,
      color: "bg-primary-100 text-primary-600",
    },
    {
      key: "payments",
      title: "Payments Report",
      description: "Export the full payment ledger with transaction references, methods, amounts, and confirmation timestamps.",
      icon: FileSpreadsheet,
      color: "bg-green-100 text-green-600",
    },
    {
      key: "complaints",
      title: "Complaints Report",
      description: "Export all complaints and refund requests with status, resolution notes, and user details.",
      icon: FileSpreadsheet,
      color: "bg-yellow-100 text-yellow-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Export operational data as CSV files</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              Date range (optional):
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="max-w-[180px]"
            />
            <span className="text-sm text-gray-400 hidden sm:block">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="max-w-[180px]"
            />
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>
                Clear dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.key} className="hover:shadow-md transition-shadow">
            <CardContent className="py-6">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${report.color} mb-4`}>
                <report.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{report.title}</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{report.description}</p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                size="sm"
                onClick={() => handleExport(report.key)}
                disabled={loading[report.key]}
              >
                {loading[report.key] ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="h-3.5 w-3.5" /> Download CSV</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
