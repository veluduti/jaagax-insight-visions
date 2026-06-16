import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  IndianRupee,
  Search,
  FileText,
  Plus,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import LoanApplicationDialog from "./LoanApplicationDialog";
import DocumentUploadDialog from "./DocumentUploadDialog";

interface Enquiry {
  id: string;
  user_id: string | null;
  advisor_id: string | null;
  loan_type: string | null;
  amount_requested: number | null;
  property_id: string | null;
  property_address: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  status: string | null;
  notes: string | null;
  emi_amount: number | null;
  emi_tenure: number | null;
  advisor_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FinancialEnquiriesManagerProps {
  userId?: string;
  agentId?: string;
}

const STATUS_TABS = [
  "all",
  "new",
  "in_progress",
  "documents_submitted",
  "under_review",
  "approved",
  "rejected",
  "disbursed",
] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const statusVariant: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  documents_submitted: "bg-purple-100 text-purple-700 border-purple-200",
  under_review: "bg-indigo-100 text-indigo-700 border-indigo-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  disbursed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const statusOrder = {
  new: 0,
  in_progress: 1,
  documents_submitted: 2,
  under_review: 3,
  approved: 4,
  rejected: 5,
  disbursed: 6,
};

export default function FinancialEnquiriesManager({ userId, agentId }: FinancialEnquiriesManagerProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [uploadFor, setUploadFor] = useState<Enquiry | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  const load = async () => {
    if (!agentId && !userId) return;
    setLoading(true);

    try {
      let query = supabase.from("financial_enquiries").select("*");

      if (agentId) {
        query = query.eq("advisor_id", agentId);
      } else if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setEnquiries((data || []) as Enquiry[]);
    } catch (error: any) {
      console.error("Error loading enquiries:", error);
      toast.error("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId || userId) load();
  }, [agentId, userId]);

  const filtered = enquiries.filter((e) => {
    if (tab !== "all" && (e.status || "new") !== tab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (e.loan_type || "").toLowerCase().includes(s) ||
        (e.buyer_name || "").toLowerCase().includes(s) ||
        (e.notes || "").toLowerCase().includes(s) ||
        (e.property_address || "").toLowerCase().includes(s) ||
        e.id.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("financial_enquiries")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`Status updated to ${status.replace("_", " ")}`);
    load();
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || "new";
    return <Badge className={`${statusVariant[s] || ""} border`}>{s.replace(/_/g, " ")}</Badge>;
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "new":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return "N/A";
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const counts = {
    all: enquiries.length,
    new: enquiries.filter((e) => e.status === "new").length,
    in_progress: enquiries.filter((e) => e.status === "in_progress").length,
    approved: enquiries.filter((e) => e.status === "approved").length,
    rejected: enquiries.filter((e) => e.status === "rejected").length,
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Financial Enquiries
              </CardTitle>
              <CardDescription>Manage loan enquiries assigned to you</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowApply(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Application
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="p-2 rounded-lg bg-primary/5 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{counts.all}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-center">
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-lg font-bold text-blue-600">{counts.new}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-center">
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-lg font-bold text-amber-600">{counts.in_progress}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 text-center">
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-lg font-bold text-green-600">{counts.approved}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 text-center">
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className="text-lg font-bold text-red-600">{counts.rejected}</p>
              </div>
            </div>

            {/* Search & Tabs */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by loan type, buyer, property, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
                <TabsList>
                  {STATUS_TABS.map((s) => (
                    <TabsTrigger key={s} value={s} className="capitalize text-xs">
                      {s.replace(/_/g, " ")}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Enquiries List */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-xl">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No enquiries found</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {search ? "Try adjusting your search" : "Create your first loan enquiry"}
                </p>
                <Button size="sm" onClick={() => setShowApply(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Enquiry
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((e, index) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedEnquiry(e)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold capitalize">{e.loan_type?.replace(/_/g, " ") || "Loan"}</span>
                          {getStatusBadge(e.status)}
                          {e.buyer_name && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {e.buyer_name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-primary">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {formatCurrency(e.amount_requested || 0)}
                          </span>
                          <span>#{e.id.slice(0, 8).toUpperCase()}</span>
                          <span>
                            {new Date(e.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {e.buyer_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {e.buyer_phone}
                            </span>
                          )}
                        </div>
                        {e.property_address && (
                          <p className="text-xs text-muted-foreground">Property: {e.property_address}</p>
                        )}
                        {e.notes && <p className="text-xs text-muted-foreground line-clamp-1">{e.notes}</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setUploadFor(e);
                          }}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          Docs
                        </Button>
                        {(e.status || "new") === "new" && (
                          <Button
                            size="sm"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              updateStatus(e.id, "in_progress");
                            }}
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                            Start
                          </Button>
                        )}
                        {(e.status || "new") === "in_progress" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                updateStatus(e.id, "rejected");
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                updateStatus(e.id, "documents_submitted");
                              }}
                            >
                              Review
                            </Button>
                          </>
                        )}
                        {(e.status || "new") === "documents_submitted" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                updateStatus(e.id, "rejected");
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                updateStatus(e.id, "under_review");
                              }}
                            >
                              Approve
                            </Button>
                          </>
                        )}
                        {(e.status || "new") === "under_review" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                updateStatus(e.id, "rejected");
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                updateStatus(e.id, "approved");
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                        {(e.status || "new") === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              updateStatus(e.id, "disbursed");
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Disburse
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <LoanApplicationDialog
        open={showApply}
        onClose={() => setShowApply(false)}
        agentId={agentId || ""}
        userId={userId || ""}
        onCreated={load}
      />

      <DocumentUploadDialog
        open={!!uploadFor}
        onClose={() => setUploadFor(null)}
        enquiryId={uploadFor?.id || null}
        onUploaded={load}
      />

      {/* Enquiry Details Dialog - can be added later */}
    </>
  );
}
