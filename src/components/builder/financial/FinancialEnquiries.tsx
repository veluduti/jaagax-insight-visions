import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { financialService, type FinancialEnquiry } from "@/services/financialService";
import EnquiryDetail from "./EnquiryDetail";
import CreateEnquiryModal from "./CreateEnquiryModal";
import { Banknote, Eye, Loader2, Plus, Building2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-cyan-100 text-cyan-700 border-cyan-200",
  documents_submitted: "bg-purple-100 text-purple-700 border-purple-200",
  under_review: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  deactivated: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function FinancialEnquiries() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [builderProfileId, setBuilderProfileId] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<FinancialEnquiry[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, under_review: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState<FinancialEnquiry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async (bpId: string) => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        financialService.getEnquiries(bpId),
        financialService.getEnquiryStats(bpId),
      ]);
      setEnquiries(list);
      setStats(s);
    } catch (e: any) {
      toast.error("Failed to load enquiries", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    financialService.getBuilderProfileId(user.id).then((bp) => {
      setBuilderProfileId(bp);
      if (bp) load(bp);
      else setLoading(false);
    });
  }, [user?.id]);

  const filtered = enquiries.filter((e) => {
    if (activeTab === "all") return true;
    if (activeTab === "under_review") return e.status === "under_review" || e.status === "documents_submitted";
    return e.status === activeTab;
  });

  // If no builder profile, show message with button
  if (!builderProfileId && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Banknote className="h-7 w-7 text-primary" /> Financial Enquiries
            </h1>
            <p className="text-muted-foreground">Manage loan enquiries, documents, EMI discussions and advisors.</p>
          </div>
          <Card className="max-w-md mx-auto p-8 text-center shadow-sm border-border">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Builder Profile Required</h2>
            <p className="text-muted-foreground mb-6">
              Create your builder profile first to manage financial enquiries.
            </p>
            <Button
              onClick={() => navigate("/add-builder-profile")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Builder Profile
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Banknote className="h-7 w-7 text-primary" /> Financial Enquiries
            </h1>
            <p className="text-muted-foreground">Manage loan enquiries, documents, EMI discussions and advisors.</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" /> Create New Enquiry
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-primary" },
            { label: "New", value: stats.new, color: "text-blue-600" },
            { label: "Under Review", value: stats.under_review, color: "text-amber-600" },
            { label: "Approved", value: stats.approved, color: "text-green-600" },
            { label: "Rejected", value: stats.rejected, color: "text-red-600" },
          ].map((s) => (
            <Card key={s.label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 max-w-xl">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="under_review">Review</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-border shadow-sm">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Banknote className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  No enquiries yet.
                </CardContent>
              </Card>
            ) : (
              filtered.map((e) => (
                <Card key={e.id} className="border-border shadow-sm hover:shadow-md transition">
                  <CardContent className="p-4 flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold capitalize">
                          {(e.enquiry_type ?? e.loan_type)?.replace(/_/g, " ") || "Loan Enquiry"}
                        </h3>
                        <Badge className={STATUS_STYLES[e.status] ?? ""}>{e.status?.replace(/_/g, " ") || "New"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Buyer: {e.user_id?.slice(0, 8) || "N/A"}… · Property:{" "}
                        {e.property_id ? e.property_id.slice(0, 8) + "…" : "—"}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                        <span>₹{Number(e.loan_amount ?? e.amount_requested ?? 0).toLocaleString()}</span>
                        {e.loan_tenure_years && <span>{e.loan_tenure_years} yrs</span>}
                        {e.interest_rate_offered && <span>{e.interest_rate_offered}%</span>}
                        <span className="text-xs">{new Date(e.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelected(e)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selected && (
        <EnquiryDetail
          enquiry={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => builderProfileId && load(builderProfileId)}
        />
      )}
    </div>
  );
}
