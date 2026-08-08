import { useMemo } from "react";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { useFinancialProvider } from "@/hooks/useFinancialProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { exportCsv, inr, normalizeStatus, STATUS_LABELS } from "@/lib/loanWorkflow";
import jsPDF from "jspdf";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function FinancialReports() {
  const { applications, stats } = useFinancialProvider();

  const period = useMemo(() => {
    const now = Date.now();
    const within = (days: number) =>
      applications.filter((a) => now - new Date(a.created_at).getTime() <= days * 864e5).length;
    return { daily: within(1), weekly: within(7), monthly: within(30) };
  }, [applications]);

  const monthly = useMemo(() => {
    const map: Record<string, number> = {};
    applications.forEach((a) => {
      const k = String(a.created_at).slice(0, 7);
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).sort().slice(-12).map(([m, apps]) => ({ m, apps }));
  }, [applications]);

  const summary = [
    ["Daily Applications", period.daily],
    ["Weekly Applications", period.weekly],
    ["Monthly Applications", period.monthly],
    ["Approval Rate", `${stats.approvalRate}%`],
    ["Rejection Rate", `${stats.rejectionRate}%`],
    ["Pending Applications", stats.pending],
    ["Total Disbursed Amount", inr(stats.disbursedAmount)],
    ["Revenue", inr(Math.round(stats.revenue))],
    ["Processing Fees", inr(stats.processingFees)],
  ] as [string, any][];

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Financial Provider Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 25);
    let y = 38;
    summary.forEach(([k, v]) => { doc.text(`${k}:`, 14, y); doc.text(String(v), 90, y); y += 8; });
    y += 6;
    doc.setFontSize(12); doc.text("Applications", 14, y); y += 8; doc.setFontSize(9);
    applications.slice(0, 30).forEach((a) => {
      doc.text(
        `${a.id.slice(0, 8)}  ${(a.buyer_name ?? a.customer_name ?? "-").slice(0, 20)}  ${inr(a.loan_amount)}  ${STATUS_LABELS[normalizeStatus(a.status)]}`,
        14, y);
      y += 6;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save("financial-report.pdf");
  }

  return (
    <FinancialLayout title="Reports" subtitle="Performance, revenue and portfolio analytics">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => exportCsv("financial-report", summary.map(([k, v]) => ({ Metric: k, Value: v })))}>
          <FileDown className="h-4 w-4 mr-2" /> Export Excel (CSV)
        </Button>
        <Button onClick={exportPdf}><Printer className="h-4 w-4 mr-2" /> Export PDF</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {summary.map(([label, value]) => (
          <Card key={label}><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Applications by Month</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="m" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="apps" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-3">
            {monthly.map((m) => (
              <Link key={m.m} to={`/dashboard/financial/applications?month=${m.m}`}>
                <Button size="sm" variant="outline">{m.m} ({m.apps})</Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </FinancialLayout>
  );
}
