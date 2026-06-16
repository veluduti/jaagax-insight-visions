import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IndianRupee, Search, FileText, Plus, Upload, RefreshCw } from "lucide-react";
import LoanApplicationDialog from "./LoanApplicationDialog";
import DocumentUploadDialog from "./DocumentUploadDialog";

interface Enquiry {
  id: string;
  user_id: string | null;
  loan_type: string | null;
  amount_requested: number | null;
  property_id: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  agentId: string;
}

const STATUS_TABS = ["all", "new", "in_progress", "approved", "rejected"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const statusVariant: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function FinancialEnquiriesManager({ agentId }: Props) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [uploadFor, setUploadFor] = useState<Enquiry | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("financial_enquiries")
      .select("*")
      .eq("advisor_id", agentId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load enquiries");
    } else {
      setEnquiries((data || []) as Enquiry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (agentId) load();
  }, [agentId]);

  const filtered = enquiries.filter((e) => {
    if (tab !== "all" && (e.status || "new") !== tab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (e.loan_type || "").toLowerCase().includes(s) ||
        (e.notes || "").toLowerCase().includes(s) ||
        e.id.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("financial_enquiries")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error("Update failed");
    toast.success("Status updated");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Financial Enquiries
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage loan enquiries assigned to you
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowApply(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Application
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by loan type, notes, or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
            <TabsList>
              {STATUS_TABS.map((s) => (
                <TabsTrigger key={s} value={s} className="capitalize">
                  {s.replace("_", " ")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No enquiries found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/40 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">
                      {e.loan_type || "Loan"}
                    </span>
                    <Badge className={statusVariant[e.status || "new"] || ""}>
                      {(e.status || "new").replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {e.amount_requested?.toLocaleString("en-IN") || "N/A"}
                    </span>
                    <span>#{e.id.slice(0, 8).toUpperCase()}</span>
                    <span>{new Date(e.created_at).toLocaleDateString()}</span>
                  </div>
                  {e.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {e.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setUploadFor(e)}>
                    <Upload className="h-4 w-4 mr-1" />
                    Docs
                  </Button>
                  {(e.status || "new") === "new" && (
                    <Button size="sm" onClick={() => updateStatus(e.id, "in_progress")}>
                      Start
                    </Button>
                  )}
                  {(e.status || "new") === "in_progress" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(e.id, "rejected")}
                      >
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => updateStatus(e.id, "approved")}>
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <LoanApplicationDialog
        open={showApply}
        onClose={() => setShowApply(false)}
        agentId={agentId}
        onCreated={load}
      />

      <DocumentUploadDialog
        open={!!uploadFor}
        onClose={() => setUploadFor(null)}
        enquiryId={uploadFor?.id || null}
      />
    </Card>
  );
}
